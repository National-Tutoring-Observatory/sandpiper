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

The script stops if `AI_GATEWAY_BASE_URL` is not on this machine (127.0.0.1, localhost or [::1]), so transcripts can't leave it by mistake. To use a model on another machine, see [Running the model on a second machine](#running-the-model-on-a-second-machine), or pass `--allowRemote`.

## `annotateSession.ts`

It reuses the worker's system prompts, the response schema built by `buildAnnotationSchema`, and the app's `LLM` client, so its output is comparable with a run made in the app.

| Option             | Required | Description                                                                                                      |
| ------------------ | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `--model`          | Yes      | The model name as the server knows it, for example `mistral-nemo` or `qwen3:32b`                                 |
| `--session`        | No       | A session file in Sandpiper's format. Defaults to the bundled synthetic session                                  |
| `--prompt`         | No       | The name of a default prompt. Defaults to `Tutor Moves (sample prompt)`                                          |
| `--promptFile`     | No       | A prompt of your own, as a JSON file (see [Your own codebook](#your-own-codebook)). Use it instead of `--prompt` |
| `--verify`         | No       | Adds the verification pass; the first-pass annotations are kept as `preVerificationAnnotations`                  |
| `--timeoutMinutes` | No       | How long to wait for each reply from the model. Defaults to 10                                                   |
| `--allowRemote`    | No       | Lets `AI_GATEWAY_BASE_URL` point at another machine                                                              |
| `--out`            | No       | Where to write the annotated session file                                                                        |

| Environment variable  | Required | Description                                                                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| `AI_GATEWAY_BASE_URL` | Yes      | The server's OpenAI-compatible address, usually ending in `/v1`. It must be on this machine unless you pass `--allowRemote` |
| `AI_GATEWAY_KEY`      | No       | Defaults to `local`. Most local servers ignore it                                                                           |

### Your own codebook

`--promptFile` reads a JSON file with the same fields as an entry in `app/modules/prompts/helpers/defaultPrompts.ts`: `name`, `annotationType` (`PER_UTTERANCE` or `PER_SESSION`), `userPrompt` and `annotationSchema`. The easiest start is a default prompt written out to a file, then edited:

```bash
mkdir -p tmp/local
yarn tsx -e 'import prompts from "./app/modules/prompts/helpers/defaultPrompts"; console.log(JSON.stringify(prompts.find((p) => p.name === "Tutor Moves (sample prompt)"), null, 2));' > tmp/local/my-codebook.json
```

Keep the three system fields (`_id`, `identifiedBy` and `reasoning`) in `annotationSchema`, and list each coded field's allowed codes in its `codes`.

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

## Running the model on a second machine

A laptop can drive a model on a bigger machine without sending transcripts anywhere else. Start the server on the second machine bound to its own 127.0.0.1, so nothing on the network can reach it, and forward a port on the laptop to it over SSH. The script then talks to a local address, and the transcripts travel only inside the SSH connection.

```bash
# On the second machine: listen on its own loopback address, four requests at a time
OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NUM_PARALLEL=4 ollama serve

# On the laptop: forward local port 11435 to it
ssh -N -L 127.0.0.1:11435:127.0.0.1:11434 second-machine

# On the laptop, in another terminal
AI_GATEWAY_BASE_URL=http://127.0.0.1:11435/v1 \
  yarn tsx scripts/localModels/annotateSession.ts \
  --model qwen3:8b \
  --session path/to/session.json \
  --out tmp/local/qwen3-8b/session.json
```

Each run of the script annotates one session, so start several at once to keep the second machine busy. Ollama queues any request beyond `OLLAMA_NUM_PARALLEL`.

On a Mac Studio (M5 Max, 32-core GPU, 36 GB) with Ollama 0.32 and `qwen3:8b`, thinking on, four requests at a time, with a per-utterance prompt holding a long codebook:

| Each request holds               | Tokens in, average | Tokens out, average | Model time per request, median | Requests an hour |
| -------------------------------- | ------------------ | ------------------- | ------------------------------ | ---------------- |
| The codebook and a few lines     | about 4,300        | about 160           | 26 to 27 seconds               | about 450        |
| The codebook and a whole session | about 5,900        | about 960           | 87 to 89 seconds               | about 160        |

Model time is measured with four requests sharing the GPU, so each one takes longer than it would alone. A long session read whole can take more than the default ten minutes on a laptop; raise `--timeoutMinutes` for those.

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

## A test on human-coded sessions

`qwen3:8b` also annotated 80 real tutoring sessions that trained coders had already coded, 1,715 tutor lines in all, using the coders' own codebook of 29 tutor moves rather than the Tutor Moves sample prompt. The sessions aren't ours to share, so neither they nor any of their text are in this repository; only the aggregate scores below are. The model was not fine-tuned. It ran with thinking on, through Sandpiper's own annotation code, served by Ollama on the Mac Studio above and reached over SSH as that section describes, so no transcript went to an outside service. Exact agreement is the share of tutor lines on which the model's first code matches the coders' primary code. Kappa is Cohen's kappa on the same pairs, counting a line left uncoded as a code of its own, with 95 percent intervals from a bootstrap over sessions.

**The codebook prompt, unchanged**, two runs each way on all 80 sessions:

| How it read each session     | Runs | Kappa [95% interval]                 | Exact agreement | Tutor lines left uncoded (coders: 278) |
| ---------------------------- | ---- | ------------------------------------ | --------------- | -------------------------------------- |
| In pieces of two tutor turns | 2    | 0.41 [0.39, 0.44], 0.40 [0.37, 0.42] | 0.47, 0.45      | 153, 136                               |
| Whole                        | 2    | 0.27 [0.24, 0.30], 0.26 [0.22, 0.30] | 0.35, 0.34      | 547, 546                               |

Each run in pieces took about two hours on the clock, four requests at a time (about 7.6 hours of model time). The two runs gave the same first code on 68 percent of tutor lines. Where they agreed, the model matched the coders' primary code on 54 percent of lines (kappa 0.49); where they differed, the first run matched it on 31 percent. Disagreement between runs looks like a useful flag for sending a line to a person.

**A clearer prompt, tested on sessions it never saw.** The 80 sessions were split once, by seed, into 40 to tune the prompt on and 40 held out. One prompt added eight coding conventions to the codebook, drawn only from the errors on the tuning half; a second added 30 coded examples on top. On the tuning half's 870 tutor lines they scored 0.49 and 0.48, against 0.40 for the unchanged prompt, so only the first went to the held-out half, once. There, on 845 tutor lines, it scored 0.52 [0.49, 0.55], against 0.42 and 0.41 for the unchanged prompt's two runs on the same lines: gains of 0.10 [0.07, 0.14] and 0.11 [0.08, 0.15]. It stopped over-using a rapport code (given first on 3 lines, against the coders' 13 and the unchanged prompt's 67) and began over-using a managing code (47 against the coders' 3).

**Against the coders' own agreement.** For each of the 16 codes with at least 15 lines, a presence kappa asks whether the model used the code on a line at all, against the coders' primary and secondary codes. Weighted by how often each code occurs, the clearer prompt averaged 0.58 on the held-out half. The coded data comes with a kappa per code for two versions of its human coding, and with the same weights those average 0.74. So the clearer prompt reached 79 percent of the coders' agreement with each other, against 70 and 68 percent for the unchanged prompt's runs on the same lines. Unweighted, the averages are 0.47 and 0.68. The human figures come from every session in the coded data, and they assume the two versions were coded independently.

**The verification pass**, in which the model checks its own labels, changed kappa by +0.000 to +0.014 in all four comparisons (three prompts on the tuning half, one on the held-out half), none clear of zero. In the LAK '26 study at <https://arxiv.org/abs/2511.09785>, a self-check of this kind doubled frontier models' mean agreement with reference coding, from 0.32 to 0.64. This model seems to need different help.

These scores sit far below the evaluation set's, which used our own reference labels on invented turns; the direction, pieces over whole sessions, still holds. This is one model, one codebook and one dataset, and the conventions describe these coders' habits, so they may not carry to another codebook. The held-out half was a little easier for every prompt, which is why the gains above compare prompts on the same lines. Like the short pieces above, the pieces of two tutor turns were cut by scripts that aren't in this branch yet.

## Limits

- **The app cannot select a local model yet.** The model list comes from `app/config/ai_gateway.json`, which is bundled into the client, and billing expects a price for every model. These scripts go around the interface.
- **Small models leave more out.** Reading whole sessions, `mistral-nemo` left 20 to 22 of the 60 clear turns blank, `qwen3:8b` 4 to 7 and `qwen3:32b` none. In short pieces, `qwen3:8b` left 0 or 1. On the session-level rubric, `mistral-nemo` returned four partial score sheets where the rubric asks for one. Compare any local model with human codes before trusting it.
- **Context length sets the memory bill.** Ollama loaded the 7 GB `mistral-nemo` file at 29 GB because its context window was set to 262,144 tokens. On a smaller machine, lower it in Ollama's settings or with `OLLAMA_CONTEXT_LENGTH`.
- **Check the model's license.** Qwen3, Mistral Nemo and OLMo are Apache 2.0; some other open-weight families carry their own terms.
- **Use data you are allowed to process.** Running locally keeps transcripts on your machine, but it does not de-identify them.
