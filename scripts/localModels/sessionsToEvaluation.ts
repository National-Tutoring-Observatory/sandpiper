/**
 * Turn session files annotated by different models into the fixture that
 * scripts/evaluations/runEvaluationReport.ts reads, so runs made outside the
 * app can be compared with the app's own agreement report (Cohen's kappa,
 * precision, recall, F1).
 *
 *   yarn tsx scripts/localModels/sessionsToEvaluation.ts comparison.json LEARNING_SUPPORT \
 *     large=out/qwen3-32b.json small=out/mistral-nemo.json
 *   yarn tsx scripts/evaluations/runEvaluationReport.ts comparison.json
 *
 * Each run is "name=path". The path is one annotated session file, or a folder
 * of them in which the file name identifies the session. The first run named
 * is the base run: precision and recall are measured against it, so put human
 * codes or the reference model first.
 */
import fse from "fs-extra";
import path from "path";
import type { SessionFile } from "../../app/modules/sessions/sessions.types";

const SINGLE_SESSION_ID = "session";

async function readRunSessions(
  runPath: string,
): Promise<Record<string, SessionFile>> {
  const stats = await fse.stat(runPath);
  if (!stats.isDirectory()) {
    return { [SINGLE_SESSION_ID]: await fse.readJSON(runPath) };
  }

  const sessions: Record<string, SessionFile> = {};
  const fileNames = (await fse.readdir(runPath)).filter((fileName) =>
    fileName.endsWith(".json"),
  );
  for (const fileName of fileNames.sort()) {
    sessions[path.basename(fileName, ".json")] = await fse.readJSON(
      path.join(runPath, fileName),
    );
  }
  return sessions;
}

async function main() {
  const [outputPath, annotationFields, ...runArguments] = process.argv.slice(2);

  if (!outputPath || !annotationFields || runArguments.length < 2) {
    throw new Error(
      "Usage: sessionsToEvaluation.ts <outPath> <annotationFields> <name=path> <name=path> [...]",
    );
  }

  const cache: Record<string, Record<string, SessionFile>> = {};
  for (const runArgument of runArguments) {
    const separatorIndex = runArgument.indexOf("=");
    if (separatorIndex < 1) {
      throw new Error(`Runs are written name=path (got "${runArgument}")`);
    }
    const runName = runArgument.slice(0, separatorIndex);
    cache[runName] = await readRunSessions(
      runArgument.slice(separatorIndex + 1),
    );
  }

  const runNames = Object.keys(cache);
  const commonSessionIds = Object.keys(cache[runNames[0]]).filter((sessionId) =>
    runNames.every((runName) => cache[runName][sessionId]),
  );
  if (commonSessionIds.length === 0) {
    throw new Error("The runs have no session in common.");
  }

  const fixture = {
    evaluation: {
      _id: "eval-local",
      name: "Local model comparison",
      project: "proj-local",
      runSet: "rs-local",
      baseRun: runNames[0],
      runs: runNames,
      annotationFields: annotationFields.split(","),
    },
    runs: runNames.map((runName) => ({
      _id: runName,
      name: runName,
      isHuman: false,
      isAdjudication: false,
      sessions: commonSessionIds.map((sessionId) => ({
        sessionId,
        status: "DONE",
      })),
      snapshot: { prompt: { annotationType: "PER_UTTERANCE" } },
    })),
    cache,
    commonSessionIds,
  };

  await fse.outputJSON(outputPath, fixture, { spaces: 2 });
  console.log(
    `Wrote ${outputPath}: ${runNames.length} runs, ${commonSessionIds.length} session(s), base run "${runNames[0]}".`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
