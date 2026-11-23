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
 *
 * Add --per-session when the runs were made with a per-session prompt.
 *
 * The report pairs labels by position, so every run must hold the same
 * utterances in the same order. This script stops if they differ.
 */
import fse from "fs-extra";
import path from "path";
import type {
  Annotation,
  SessionFile,
} from "../../app/modules/sessions/sessions.types";

const SINGLE_SESSION_ID = "session";
const PER_SESSION_FLAG = "--per-session";

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

function getUtteranceIds(sessionFile: SessionFile): string {
  return (sessionFile.transcript || [])
    .map((utterance) => utterance._id)
    .join(",");
}

function hasFieldValue(
  annotations: Annotation[] | undefined,
  fieldKeys: string[],
): boolean {
  return (annotations || []).some((annotation) =>
    fieldKeys.some(
      (fieldKey) =>
        annotation[fieldKey] !== undefined && annotation[fieldKey] !== null,
    ),
  );
}

async function main() {
  const commandArguments = process.argv.slice(2);
  const isPerSession = commandArguments.includes(PER_SESSION_FLAG);
  const [outputPath, annotationFields, ...runArguments] =
    commandArguments.filter((argument) => argument !== PER_SESSION_FLAG);

  if (!outputPath || !annotationFields || runArguments.length < 2) {
    throw new Error(
      "Usage: sessionsToEvaluation.ts <outPath> <annotationFields> <name=path> <name=path> [...] [--per-session]",
    );
  }
  const fieldKeys = annotationFields.split(",");

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
  const allSessionIds = [
    ...new Set(runNames.flatMap((runName) => Object.keys(cache[runName]))),
  ].sort();
  const commonSessionIds = allSessionIds.filter((sessionId) =>
    runNames.every((runName) => cache[runName][sessionId]),
  );
  if (commonSessionIds.length === 0) {
    throw new Error(
      "The runs have no session in common. Give every run a single file, or give every run a folder whose file names match.",
    );
  }

  for (const sessionId of allSessionIds) {
    if (commonSessionIds.includes(sessionId)) continue;
    const missingFrom = runNames.filter(
      (runName) => !cache[runName][sessionId],
    );
    console.warn(
      `Left out session "${sessionId}": missing from ${missingFrom.join(", ")}.`,
    );
  }

  for (const sessionId of commonSessionIds) {
    const expectedIds = getUtteranceIds(cache[runNames[0]][sessionId]);
    for (const runName of runNames.slice(1)) {
      if (getUtteranceIds(cache[runName][sessionId]) !== expectedIds) {
        throw new Error(
          `Session "${sessionId}" does not hold the same utterances in "${runNames[0]}" and "${runName}". The report pairs labels by position, so the runs must start from the same transcript.`,
        );
      }
    }
  }

  const hasUtteranceLabels = runNames.some((runName) =>
    commonSessionIds.some((sessionId) =>
      (cache[runName][sessionId].transcript || []).some((utterance) =>
        hasFieldValue(utterance.annotations, fieldKeys),
      ),
    ),
  );
  const hasSessionLabels = runNames.some((runName) =>
    commonSessionIds.some((sessionId) =>
      hasFieldValue(cache[runName][sessionId].annotations, fieldKeys),
    ),
  );
  if (!isPerSession && !hasUtteranceLabels && hasSessionLabels) {
    throw new Error(
      `These runs carry "${annotationFields}" on the session, not on its utterances. Add ${PER_SESSION_FLAG}.`,
    );
  }
  if (isPerSession && !hasSessionLabels) {
    throw new Error(
      `${PER_SESSION_FLAG} was given, but no run carries "${annotationFields}" on a session.`,
    );
  }

  const fixture = {
    evaluation: {
      _id: "eval-local",
      name: "Local model comparison",
      project: "proj-local",
      runSet: "rs-local",
      baseRun: runNames[0],
      runs: runNames,
      annotationFields: fieldKeys,
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
      snapshot: {
        prompt: {
          annotationType: isPerSession ? "PER_SESSION" : "PER_UTTERANCE",
        },
      },
    })),
    cache,
    commonSessionIds,
  };

  await fse.outputJSON(outputPath, fixture, { spaces: 2 });
  console.log(
    `Wrote ${outputPath}: ${runNames.length} runs, ${commonSessionIds.length} of ${allSessionIds.length} session(s), base run "${runNames[0]}".`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
