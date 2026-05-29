import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Evaluation } from "../../app/modules/evaluations/evaluations.types";
import buildEvaluationReport, {
  type SessionFileCache,
} from "../../app/modules/evaluations/helpers/buildEvaluationReport";
import type { Run } from "../../app/modules/runs/runs.types";

interface Fixture {
  evaluation: Evaluation;
  runs: Run[];
  cache: SessionFileCache;
  commonSessionIds: string[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const fixturePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(__dirname, "sampleEvaluation.json");

  const shouldIncludeUnannotatedSamplesArg = process.argv[3];

  if (
    shouldIncludeUnannotatedSamplesArg !== undefined &&
    shouldIncludeUnannotatedSamplesArg !== "true" &&
    shouldIncludeUnannotatedSamplesArg !== "false"
  ) {
    console.error(
      `[error] shouldIncludeUnannotatedSamples must be "true" or "false" (got "${shouldIncludeUnannotatedSamplesArg}")`,
    );
    process.exit(1);
  }

  const shouldIncludeUnannotatedSamples =
    shouldIncludeUnannotatedSamplesArg === undefined
      ? true
      : shouldIncludeUnannotatedSamplesArg === "true";

  console.log(`[input] Loading fixture: ${fixturePath}`);
  console.log(
    `[input] shouldIncludeUnannotatedSamples: ${shouldIncludeUnannotatedSamples}`,
  );
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as Fixture;

  console.log(`[input] Evaluation: ${fixture.evaluation.name}`);
  console.log(`[input] Base run:   ${fixture.evaluation.baseRun}`);
  console.log(
    `[input] Fields:     ${fixture.evaluation.annotationFields.join(", ")}`,
  );
  console.log(
    `[input] Runs:       ${fixture.runs.map((r) => `${r._id}(${r.name})`).join(", ")}`,
  );
  console.log(`[input] Sessions:   ${fixture.commonSessionIds.join(", ")}`);

  for (const fieldKey of fixture.evaluation.annotationFields) {
    console.log(`\n[labels] Field "${fieldKey}" (pooled across sessions):`);
    for (const run of fixture.runs) {
      const labels: string[] = [];
      for (const sessionId of fixture.commonSessionIds) {
        const sessionJSON = fixture.cache[run._id]?.[sessionId];
        if (!sessionJSON) continue;
        for (const utterance of sessionJSON.transcript || []) {
          const match = (utterance.annotations || []).find(
            (a) => a[fieldKey] !== undefined && a[fieldKey] !== null,
          );
          labels.push(match ? String(match[fieldKey]) : "");
        }
      }
      console.log(
        `  ${run._id.padEnd(6)} [${labels.map((l) => `"${l}"`).join(", ")}]`,
      );
    }
  }

  console.log("\n[running] buildEvaluationReport...");
  const report = await buildEvaluationReport(
    fixture.evaluation,
    fixture.runs,
    fixture.cache,
    fixture.commonSessionIds,
    { shouldIncludeUnannotatedSamples },
  );

  console.log("\n[output] Report:");
  for (const fieldReport of report) {
    console.log(`\n  Field: ${fieldReport.fieldKey}`);
    console.log(`    meanKappa: ${fieldReport.meanKappa}`);
    console.log(`    pairwise:`);
    for (const pair of fieldReport.pairwise) {
      const prf1 =
        pair.f1 !== undefined
          ? ` | P=${pair.precision} R=${pair.recall} F1=${pair.f1}`
          : "";
      console.log(
        `      ${pair.runA} vs ${pair.runB}: kappa=${pair.kappa} n=${pair.sampleSize}${prf1}`,
      );
    }
    console.log(`    runSummaries:`);
    for (const summary of fieldReport.runSummaries) {
      console.log(
        `      ${summary.runId} (${summary.runName}): meanKappaWithOthers=${summary.meanKappaWithOthers}`,
      );
    }
  }

  console.log("\n[output] Raw JSON:");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
