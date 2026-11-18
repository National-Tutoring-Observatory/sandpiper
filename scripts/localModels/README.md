# Local model scripts

Helpers for running Sandpiper's annotation on a model served on your own machine, so transcripts never leave it. They need no code changes to the app: the `AI_GATEWAY` provider is an OpenAI-compatible client that reads its address and key from the environment, so pointing `AI_GATEWAY_BASE_URL` at a local server is enough.

| Script                           | What it does                                                                                   | Needs                       |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- |
| `annotateSession.ts`             | Annotates one session file with a local model, with an optional verification pass              | A model server              |
| `sessionsToEvaluation.ts`        | Turns annotated session files into a fixture for the agreement report in `scripts/evaluations` | Two or more annotated files |
| `annotatePerUtterance.check.ts`  | Runs the worker's real `annotatePerUtterance` task against a local model                       | A model server              |
| `fixtures/syntheticSession.json` | A 16-utterance tutoring exchange, invented for these checks. It is not real student data       |                             |
| `fixtures/evalSet/`              | Ten invented sessions with a reference label for each tutor turn, for comparing models         |                             |

None of them needs MongoDB, Redis, storage or an account.

## Quick start with Ollama

```bash
ollama pull mistral-nemo

AI_GATEWAY_BASE_URL=http://127.0.0.1:11434/v1 \
  yarn tsx scripts/localModels/annotateSession.ts \
  --model mistral-nemo \
  --out tmp/local/mistral-nemo.json
```

The script prints a summary (annotations, tokens, seconds, and how many annotations pointed at an utterance that does not exist) followed by one line per annotation.

Any server that speaks the OpenAI chat API should work the same way: llama.cpp's `llama-server`, LM Studio, vLLM or a LiteLLM proxy. Only Ollama has been tried so far.

## `annotateSession.ts`

It reuses the worker's system prompts, the response schema built by `buildAnnotationSchema`, and the app's `LLM` client, so its output is comparable with a run made in the app.

| Option      | Required | Description                                                                                     |
| ----------- | -------- | ----------------------------------------------------------------------------------------------- |
| `--model`   | Yes      | The model name as the server knows it, for example `mistral-nemo` or `qwen3:32b`                |
| `--session` | No       | A session file in Sandpiper's format. Defaults to the bundled synthetic session                 |
| `--prompt`  | No       | The name of a default prompt. Defaults to `Tutor Moves (sample prompt)`                         |
| `--verify`  | No       | Adds the verification pass; the first-pass annotations are kept as `preVerificationAnnotations` |
| `--out`     | No       | Where to write the annotated session file                                                       |

| Environment variable  | Required | Description                                                     |
| --------------------- | -------- | --------------------------------------------------------------- |
| `AI_GATEWAY_BASE_URL` | Yes      | The server's OpenAI-compatible address, usually ending in `/v1` |
| `AI_GATEWAY_KEY`      | No       | Defaults to `local`. Most local servers ignore it               |

## Comparing models

`sessionsToEvaluation.ts` writes the fixture that [`runEvaluationReport.ts`](../evaluations/README.md) reads, so runs made outside the app are scored by the same code the app uses: Cohen's kappa for each pair, plus precision, recall and F1 against the base run.

```bash
yarn tsx scripts/localModels/sessionsToEvaluation.ts tmp/local/comparison.json LEARNING_SUPPORT \
  large=tmp/local/qwen3-32b.json \
  small=tmp/local/mistral-nemo.json

yarn tsx scripts/evaluations/runEvaluationReport.ts tmp/local/comparison.json
```

Each run is `name=path`. The path is one annotated session file, or a folder of them in which the file name identifies the session. The first run named is the base run, so put human codes or your reference model first.

Two rules keep the comparison honest:

- **Every run must start from the same transcripts.** The report pairs labels by position, so the script stops if a session holds different utterances in two runs. A session that is missing from any run is left out, and the script names it.
- **Say when the prompt is per session.** Add `--per-session` for runs made with a per-session prompt such as the Tutoring Quality Rubric. The script stops if the flag and the files disagree.

## A small evaluation set

`fixtures/evalSet/` holds ten invented tutoring sessions (160 utterances, 80 of them the tutor's) and a reference label for each tutor turn under the Tutor Moves codebook. Each of the fifteen codes appears in four turns written to show that code alone. Ten more turns mix two codes, and ten carry no code. In the reference files, `designedAs` says which kind a turn is, and `secondaryCode` holds a mixed turn's second code.

```bash
for session in scripts/localModels/fixtures/evalSet/sessions/*.json; do
  AI_GATEWAY_BASE_URL=http://127.0.0.1:11434/v1 \
    yarn tsx scripts/localModels/annotateSession.ts \
    --model mistral-nemo \
    --session "$session" \
    --out "tmp/local/mistral-nemo/$(basename "$session")"
done

yarn tsx scripts/localModels/sessionsToEvaluation.ts tmp/local/comparison.json LEARNING_SUPPORT \
  reference=scripts/localModels/fixtures/evalSet/reference \
  small=tmp/local/mistral-nemo

yarn tsx scripts/evaluations/runEvaluationReport.ts tmp/local/comparison.json
```

Annotate the files in `sessions/`, never those in `reference/`: `annotateSession.ts` adds its labels after any already in the file, and the report reads the first label it finds.

Read the scores with care. The reference labels were fixed when the turns were written, before any model saw them. They are a design, not human coding: nobody has coded these sessions independently, and invented turns are cleaner than real ones. The set shows whether a model follows the codebook and how models compare with each other. It does not show how accurate a model is on real tutoring data.

## Checking the worker task

`annotatePerUtterance.check.ts` calls the task the queue runs in production. Only the database, sockets, storage and credit notices are stubbed.

```bash
AI_GATEWAY_BASE_URL=http://127.0.0.1:11434/v1 LOCAL_MODEL=mistral-nemo \
  yarn vitest run -c scripts/localModels/vitest.config.ts
```

Add `LOCAL_VERIFY=true` to include the verification pass. The check has its own vitest config and skips itself when the variables are unset, so the main test suite and CI never call a model.

## What the server has to support

- Streaming chat completions that report token usage (`stream_options.include_usage`).
- Structured output through `response_format` with a JSON schema. Sandpiper sends the codebook as a schema and parses the reply as JSON.
- For models that think before answering, the thinking has to arrive apart from the answer. Ollama does this for Qwen3.

## First runs

On an Apple M3 Max with 64 GB of memory and Ollama 0.32, using the bundled session:

| Model          | Parameters | License    | Task                                 | Seconds | Annotations |
| -------------- | ---------- | ---------- | ------------------------------------ | ------- | ----------- |
| `mistral-nemo` | 12.2B      | Apache 2.0 | Tutor Moves, per utterance           | 34      | 5           |
| `mistral-nemo` | 12.2B      | Apache 2.0 | Tutor Moves with verification        | 36      | 6           |
| `qwen3:32b`    | 32.8B      | Apache 2.0 | Tutor Moves, per utterance           | 186     | 11          |
| `mistral-nemo` | 12.2B      | Apache 2.0 | Tutoring Quality Rubric, per session | 39      | 4           |

Every reply parsed as JSON, and no annotation used an utterance id or a code outside the schema. That shows the wiring works. It says nothing about whether the labels are right: one invented session is not a benchmark.

## Results on the evaluation set

Each model annotated the ten sessions in `fixtures/evalSet/` on the same machine as the first runs. Kappa is Cohen's kappa against the reference labels over all 160 utterances, from `runEvaluationReport.ts` with the reference as the base run. A clear turn is one of the sixty written to show a single code. Nothing sets a temperature, so identical runs differ, and a cell with several figures lists each run.

| Model          | How it read each session           | Runs | Kappa            | Clear turns labelled right (of 60) | Seconds for the ten sessions |
| -------------- | ---------------------------------- | ---- | ---------------- | ---------------------------------- | ---------------------------- |
| `mistral-nemo` | Whole                              | 2    | 0.61, 0.58       | 29, 28                             | 127, 138                     |
| `mistral-nemo` | Whole, with verification           | 1    | 0.58             | 32                                 | 350                          |
| `mistral-nemo` | In short pieces                    | 1    | 0.76             | 40                                 | 170                          |
| `mistral-nemo` | In short pieces, with verification | 1    | 0.62             | 32                                 | 405                          |
| `qwen3:8b`     | Whole                              | 3    | 0.77, 0.86, 0.79 | 44, 50, 46                         | 509, 460, 513                |
| `qwen3:8b`     | In short pieces                    | 2    | 0.92, 0.90       | 56, 55                             | 1022, 917                    |
| `qwen3:32b`    | Whole                              | 1    | 0.87             | 56                                 | 1705                         |

"In short pieces" means each session was cut into four parts (utterances 1 to 3, 4 to 7, 8 to 11 and 12 to 16), each part was annotated as a session of its own, and the labels were joined back together. The scripts here don't do that cutting yet.

Every run finished all ten sessions, and in the eleven runs only one label fell outside the codebook or pointed at an utterance that does not exist. Nine of the eleven runs labelled at least one student turn, which Tutor Moves doesn't code. The two short-piece runs of `qwen3:8b` agreed with each other at kappa 0.94, and its three whole-session runs at 0.74 to 0.79.

Read these as scores against a design, for the reasons given above. `qwen3:32b` ran once, on whole sessions only, so it is no like-for-like match for `qwen3:8b` in short pieces.

## Limits

- **The app cannot select a local model yet.** The model list comes from `app/config/ai_gateway.json`, which is bundled into the client, and billing expects a price for every model. These scripts go around the interface.
- **Small models leave more out.** Reading whole sessions, `mistral-nemo` left 20 to 22 of the 60 clear turns blank, `qwen3:8b` 4 to 7 and `qwen3:32b` none. In short pieces, `qwen3:8b` left 0 or 1. On the session-level rubric, `mistral-nemo` returned four partial score sheets where the rubric asks for one. Compare any local model with human codes before trusting it.
- **Context length sets the memory bill.** Ollama loaded the 7 GB `mistral-nemo` file at 29 GB because its context window was set to 262,144 tokens. On a smaller machine, lower it in Ollama's settings or with `OLLAMA_CONTEXT_LENGTH`.
- **Check the model's license.** Qwen3, Mistral Nemo and OLMo are Apache 2.0; some other open-weight families carry their own terms.
- **Use data you are allowed to process.** Running locally keeps transcripts on your machine, but it does not de-identify them.
