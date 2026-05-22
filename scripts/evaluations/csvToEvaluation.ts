import { parse } from "csv-parse/sync";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import buildAnnotationsForUtterance from "../../app/modules/humanAnnotations/helpers/buildAnnotationsForUtterance";
import parseAnnotationColumn from "../../app/modules/humanAnnotations/helpers/parseAnnotationColumns";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface CsvRow {
  _id: string;
  session_id: string;
  sequence_id: string;
  role: string;
  content: string;
  start_time?: string;
  end_time?: string;
  [key: string]: string | undefined;
}

async function main() {
  const csvPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(
        __dirname,
        "6a0b2252f10cb3785d0479e0-6a0b22def10cb3785d04a99a-utterances.csv",
      );
  const outPath = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(__dirname, "simEvaluation.json");
  const annotationFieldsArg = process.argv[4];
  const baseRunArg = process.argv[5];

  if (!annotationFieldsArg) {
    console.error(
      "Usage: tsx scripts/evaluations/csvToEvaluation.ts <csvPath> <outPath> <annotationFields> [baseRun]",
    );
    console.error(
      "  <annotationFields>: comma-separated, e.g., LEARNING_SUPPORT or LEARNING_SUPPORT,markedAs",
    );
    console.error(
      "  [baseRun]:          annotator to use as base run. Defaults to the first annotator alphabetically.",
    );
    process.exit(1);
  }

  const ANNOTATION_FIELDS = annotationFieldsArg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`[input]  CSV:    ${csvPath}`);
  console.log(`[output] JSON:   ${outPath}`);
  console.log(`[input]  Fields: ${ANNOTATION_FIELDS.join(", ")}`);

  const csvContent = fs.readFileSync(csvPath, "utf8");
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
  console.log(`[input]  Parsed rows: ${rows.length}`);

  const headers = Object.keys(rows[0] ?? {});

  const annotators = new Set<string>();
  for (const header of headers) {
    const parsed = parseAnnotationColumn(header);
    if (parsed) annotators.add(parsed.annotator);
  }

  const sortedAnnotators = [...annotators].sort((a, b) => a.localeCompare(b));
  const baseRun = baseRunArg ?? sortedAnnotators[0];

  if (!baseRun) {
    console.error(`[error] No annotator columns found in CSV.`);
    process.exit(1);
  }

  if (!annotators.has(baseRun)) {
    console.error(
      `[error] baseRun "${baseRun}" not found in CSV annotators: ${sortedAnnotators.join(", ")}`,
    );
    process.exit(1);
  }

  // baseRun first, then the rest alphabetically
  const runIds = [baseRun, ...sortedAnnotators.filter((a) => a !== baseRun)];
  console.log(`[input]  Base run: ${baseRun}`);
  console.log(`[input]  Annotators (runs): ${runIds.join(", ")}`);

  const sessionOrder: string[] = [];
  const sessionsRows = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const sessionId = row.session_id;
    if (!sessionsRows.has(sessionId)) {
      sessionOrder.push(sessionId);
      sessionsRows.set(sessionId, []);
    }
    sessionsRows.get(sessionId)!.push(row);
  }
  console.log(
    `[input]  Unique sessions: ${sessionOrder.length} (first 5: ${sessionOrder.slice(0, 5).join(", ")})`,
  );

  const cache: Record<
    string,
    Record<
      string,
      {
        transcript: Array<Record<string, unknown>>;
        leadRole: string;
        annotations: unknown[];
      }
    >
  > = {};

  for (const runId of runIds) {
    cache[runId] = {};
    let runAnnotationCount = 0;

    for (const sessionId of sessionOrder) {
      const sessionRows = sessionsRows.get(sessionId)!;
      const transcript = sessionRows.map((row) => {
        const utteranceId = `${sessionId}-${row._id}`;
        const annotations = buildAnnotationsForUtterance(
          row as Record<string, string>,
          utteranceId,
          runId,
          headers,
        );
        runAnnotationCount += annotations.length;
        return {
          _id: utteranceId,
          role: row.role,
          content: row.content,
          start_time: row.start_time ?? "",
          end_time: row.end_time ?? "",
          timestamp: "",
          session_id: sessionId,
          sequence_id: row.sequence_id,
          annotations,
        };
      });

      cache[runId][sessionId] = {
        transcript,
        leadRole: "volunteer",
        annotations: [],
      };
    }

    console.log(
      `[output] Run "${runId}": ${runAnnotationCount} annotations across ${sessionOrder.length} sessions`,
    );
  }

  const evaluation = {
    _id: "eval-sim",
    name: "Sim evaluation",
    project: "proj-sim",
    runSet: "rs-sim",
    baseRun,
    runs: runIds,
    annotationFields: ANNOTATION_FIELDS,
  };

  const runs = runIds.map((runId) => ({
    _id: runId,
    name: runId,
    isHuman: false,
    isAdjudication: false,
    sessions: sessionOrder.map((sessionId) => ({
      sessionId,
      status: "DONE",
    })),
    snapshot: { prompt: { annotationType: "PER_UTTERANCE" } },
  }));

  const fixture = {
    evaluation,
    runs,
    cache,
    commonSessionIds: sessionOrder,
  };

  fs.writeFileSync(outPath, JSON.stringify(fixture, null, 2));
  const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
  console.log(`[output] Wrote ${outPath} (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
