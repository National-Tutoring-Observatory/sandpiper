# Evaluation scripts

Two helpers for running evaluation reports outside the app — useful for ad-hoc analysis of CSV exports without going through the database.

| Script                   | Input                                | Output                                 |
| ------------------------ | ------------------------------------ | -------------------------------------- |
| `csvToEvaluation.ts`     | Utterance CSV with annotator columns | Evaluation fixture JSON                |
| `runEvaluationReport.ts` | Evaluation fixture JSON              | Kappa / Precision / Recall / F1 report |

## End-to-end example

```bash
# 1. Convert a CSV export into an evaluation fixture
yarn tsx scripts/evaluations/csvToEvaluation.ts \
  scripts/evaluations/my-utterances.csv \
  scripts/evaluations/myEvaluation.json \
  LEARNING_SUPPORT \
  sim

# 2. Run the report against the fixture
yarn tsx scripts/evaluations/runEvaluationReport.ts \
  scripts/evaluations/myEvaluation.json
```

---

## `csvToEvaluation.ts`

Converts a transcript CSV (the format produced by `outputRunSetDataToCSV`) into the JSON fixture shape that `runEvaluationReport.ts` expects. Each distinct annotator in the CSV becomes its own run.

### Usage

```bash
yarn tsx scripts/evaluations/csvToEvaluation.ts <csvPath> <outPath> <annotationFields> [baseRun]
```

| Arg                  | Required | Description                                                                                                                         |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `<csvPath>`          | No       | Path to the utterance CSV. Defaults to the bundled sample file.                                                                     |
| `<outPath>`          | No       | Where to write the fixture JSON. Defaults to `simEvaluation.json`.                                                                  |
| `<annotationFields>` | Yes      | Comma-separated annotation field keys, e.g. `LEARNING_SUPPORT` or `LEARNING_SUPPORT,markedAs`.                                      |
| `[baseRun]`          | No       | Annotator name to use as the base run. Must match one of the annotators in the CSV. Defaults to the first annotator alphabetically. |

### Expected CSV format

Per-utterance rows with columns:

- `_id`, `session_id`, `sequence_id`, `role`, `content`, `start_time`, `end_time`
- Annotation columns named `annotator[<name>][<index>]<field>`
  - `<name>` — annotator identifier (becomes a run, e.g. `sim`, `AI-0`)
  - `<index>` — multiple annotations per utterance from the same annotator use ascending indices
  - `<field>` — the annotation field (e.g. `LEARNING_SUPPORT`, `markedAs`, `reasoning`)

This is the format produced by [`outputRunSetDataToCSV`](../../app/functions/outputRunSetDataToCSV/app.ts). Column headers are parsed using [`parseAnnotationColumn`](../../app/modules/humanAnnotations/helpers/parseAnnotationColumns.ts), and per-utterance annotation arrays are built with [`buildAnnotationsForUtterance`](../../app/modules/humanAnnotations/helpers/buildAnnotationsForUtterance.ts).

### Output shape

```json
{
  "evaluation": {
    "_id": "eval-sim",
    "name": "Sim evaluation",
    "project": "proj-sim",
    "runSet": "rs-sim",
    "baseRun": "sim",
    "runs": ["sim", "AI-0", "AI-1", "AI-2"],
    "annotationFields": ["LEARNING_SUPPORT"]
  },
  "runs": [
    {
      "_id": "sim",
      "name": "sim",
      "isHuman": false,
      "isAdjudication": false,
      "sessions": [{ "sessionId": "10376", "status": "DONE" }],
      "snapshot": { "prompt": { "annotationType": "PER_UTTERANCE" } }
    }
  ],
  "cache": {
    "sim": {
      "10376": {
        "transcript": [
          {
            "_id": "10376-0",
            "role": "student",
            "content": "Hello!",
            "annotations": []
          }
        ],
        "leadRole": "volunteer",
        "annotations": []
      }
    }
  },
  "commonSessionIds": ["10376"]
}
```

### Notes / current behavior

- `baseRun` defaults to the first annotator alphabetically. Pass it explicitly as the 4th arg to override. The script errors out if the supplied `baseRun` isn't one of the annotators discovered in the CSV.
- Evaluation identifiers (`_id`, `name`, `project`, `runSet`) are placeholders — they're only used for display by the report.
- Sessions are kept in the order they first appear in the CSV.
- An utterance with no annotation cells for a given annotator gets `annotations: []` for that run.

---

## `runEvaluationReport.ts`

Loads a fixture JSON file and runs [`buildEvaluationReport`](../../app/modules/evaluations/helpers/buildEvaluationReport.ts) against it — the same code path the app uses. Prints pooled labels per run, then the computed report.

### Usage

```bash
yarn tsx scripts/evaluations/runEvaluationReport.ts [fixturePath] [shouldIncludeUnannotatedSamples]
```

| Arg                                 | Required | Description                                                                                                                                                                                                                          |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `[fixturePath]`                     | No       | Path to a fixture JSON. Defaults to `sampleEvaluation.json`.                                                                                                                                                                         |
| `[shouldIncludeUnannotatedSamples]` | No       | `true` or `false`. When `false`, utterance pairs where neither annotator labeled the field are excluded from the sample. Defaults to `true` (matches the pre-`shouldIncludeUnannotatedSamples` behavior of `buildEvaluationReport`). |

### Output

For each annotation field in `evaluation.annotationFields`:

- **Pooled labels** per run, in session/utterance order — useful to eyeball alignment.
- **`meanKappa`** — average pairwise Cohen's Kappa across all run pairs for the field.
- **`pairwise`** — every run-pair with `kappa`, `sampleSize`, and (when one side is `baseRun`) `precision`, `recall`, `f1`.
- **`runSummaries`** — `meanKappaWithOthers` for each run.
- Full raw JSON report at the bottom.

Example output:

```
[output] Report:

  Field: LEARNING_SUPPORT
    meanKappa: 0.41
    pairwise:
      sim vs AI-0: kappa=0.47 n=1643 | P=0.4 R=0.49 F1=0.44
      sim vs AI-1: kappa=0.18 n=1463 | P=0.42 R=0.22 F1=0.29
      sim vs AI-2: kappa=0.46 n=1643 | P=0.4 R=0.49 F1=0.44
      AI-0 vs AI-1: kappa=0.19 n=1562
      AI-0 vs AI-2: kappa=0.97 n=1477
      AI-1 vs AI-2: kappa=0.2 n=1562
    runSummaries:
      sim (sim): meanKappaWithOthers=0.37
      AI-0 (AI-0): meanKappaWithOthers=0.54
      AI-1 (AI-1): meanKappaWithOthers=0.19
      AI-2 (AI-2): meanKappaWithOthers=0.54
```

### Config

`shouldIncludeUnannotatedSamples` controls whether utterance pairs where neither annotator labeled the field count toward the sample. Default is `true` (include empty pairs) — this matches the behavior of `buildEvaluationReport` before the `shouldIncludeUnannotatedSamples` option was introduced. Pass `false` as the 2nd arg to exclude them:

```bash
yarn tsx scripts/evaluations/runEvaluationReport.ts scripts/evaluations/myEvaluation.json false
```

---

## Related references

- [Evaluations module docs](../../documentation/evaluations.md) — feature-level overview
- [Evaluation equations](../../documentation/evaluation-equations.md) — math for Kappa / Precision / Recall / F1
- [`buildEvaluationReport.ts`](../../app/modules/evaluations/helpers/buildEvaluationReport.ts) — the implementation under the hood
