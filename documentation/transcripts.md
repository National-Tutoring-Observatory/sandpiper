---
title: "Transcripts"
tags: ["transcripts", "run", "run-sets"]
category: "Data Management"
isPublished: true
---

# Transcripts

This guide describes the file formats Sandpiper accepts when you upload tutoring session data, and the internal JSON structure those files are converted into for annotation and analysis.

## Overview

Transcripts represent conversations between tutors and students. Each transcript consists of:

- **Utterances** — individual turns in the conversation
- **Annotations** — labels or codes applied to utterances or to the session as a whole

Sandpiper accepts uploads in two formats: **CSV** and **JSONL**. Both are converted into a canonical JSON structure during ingestion, then used as **Sessions** for annotation runs.

## Supported Upload Formats

Files are detected by extension:

| Extension | Format | Notes                                                    |
| --------- | ------ | -------------------------------------------------------- |
| `.csv`    | CSV    | One utterance per row, with a header row                 |
| `.jsonl`  | JSONL  | One JSON object per line, each representing an utterance |

Direct `.json` uploads are not currently supported — use CSV or JSONL.

### Required Fields

Every utterance row or record must include these fields:

| Field         | Type   | Description                                             |
| ------------- | ------ | ------------------------------------------------------- |
| `session_id`  | string | Identifier grouping utterances into a session           |
| `role`        | string | Speaker role (e.g. `Tutor`, `Student`, `Teacher`)       |
| `content`     | string | The actual text spoken in this turn                     |
| `sequence_id` | string | Sequential position of the utterance within its session |

A single file can contain multiple sessions — utterances are grouped by their `session_id` during processing.

### Optional Field Aliases

Sandpiper accepts common alternate column names and maps them automatically:

| Canonical Field | Accepted Aliases         |
| --------------- | ------------------------ |
| `session_id`    | `sessionId`, `sessionID` |
| `role`          | `speaker`                |
| `content`       | `text`                   |
| `sequence_id`   | _(no aliases)_           |

### CSV Example

```csv
session_id,role,content,sequence_id
session_001,Tutor,Hello! Today we're going to work on fractions.,1
session_001,Student,Hi! I'm ready to learn.,2
session_001,Tutor,Great! Let's start with a simple example.,3
session_002,Tutor,Welcome back! Let's review decimals today.,1
session_002,Student,Hello! I've been practicing.,2
```

### JSONL Example

```jsonl
{"session_id":"session_003","role":"Tutor","content":"Welcome to our algebra lesson!","sequence_id":1}
{"session_id":"session_003","role":"Student","content":"Hi! I'm excited to learn algebra.","sequence_id":2}
{"session_id":"session_004","role":"Tutor","content":"Today we're covering geometry basics.","sequence_id":1}
```

## How Upload Works

1. **File Upload:** Drop a `.csv` or `.jsonl` file into a Project. Sandpiper detects the file type and parses it.
2. **Attribute Mapping:** Sandpiper inspects the first record to map your columns or fields to its canonical schema. If column names match an accepted alias (e.g. `speaker` for `role`), the mapping is applied automatically. The lead role for the conversation is inferred by an LLM from the unique roles in the file.
3. **Session Splitting:** Utterances are grouped by `session_id` and split into one session per group.
4. **Conversion:** Each session is converted into the internal transcript JSON structure (described below), with `_id` assigned, utterances ordered by `sequence_id`, and an empty `annotations` array attached to each utterance.
5. **Ready for Runs:** Once converted, sessions can be added to Run Sets and annotated by LLMs or human raters.

## Internal Transcript Structure

After conversion, each session is represented as a JSON document. This structure is what annotation runs read from and write to.

The formal schema lives at [`app/lib/schemas/json/transcript.schema.json`](../../app/lib/schemas/json/transcript.schema.json).

### Format

```json
{
  "transcript": [
    {
      "_id": "string (required)",
      "role": "string (required)",
      "content": "string (required)",
      "start_time": "string (optional)",
      "end_time": "string (optional)",
      "session_id": "string (optional)",
      "sequence_id": "string (optional)",
      "annotations": []
    }
  ],
  "leadRole": "string (optional)",
  "annotations": []
}
```

### Root Fields

| Field         | Type   | Required | Description                                                       |
| ------------- | ------ | -------- | ----------------------------------------------------------------- |
| `transcript`  | Array  | **Yes**  | Array of utterance objects representing the conversation          |
| `leadRole`    | String | No       | Primary instructor role (e.g., "Tutor", "Teacher")                |
| `annotations` | Array  | No       | Session-level annotations (used with PER_SESSION annotation type) |

### Utterance Object

| Field         | Type   | Required | Description                                                                                              |
| ------------- | ------ | -------- | -------------------------------------------------------------------------------------------------------- |
| `_id`         | String | **Yes**  | Unique identifier for this utterance within the session. Used to match annotations across multiple runs. |
| `role`        | String | **Yes**  | Speaker role (e.g., "Tutor", "Student", "Teacher", "STUDENT_1")                                          |
| `content`     | String | **Yes**  | The actual text spoken in this turn                                                                      |
| `start_time`  | String | No       | Timestamp when utterance begins (format flexible)                                                        |
| `end_time`    | String | No       | Timestamp when utterance ends (format flexible)                                                          |
| `session_id`  | String | No       | Session identifier (may be added during processing)                                                      |
| `sequence_id` | String | No       | Sequential position in conversation                                                                      |
| `annotations` | Array  | No       | Utterance-level annotations (used with PER_UTTERANCE annotation type)                                    |

## Annotation Types

Sandpiper supports two annotation granularities. The annotation type is determined by the **Prompt** used in the run, not by the transcript file itself.

### PER_UTTERANCE

Annotations are attached to individual utterances. Each utterance can have multiple annotations.

**Use case:** Coding individual turns (e.g., identifying praise, questions, feedback).

```json
{
  "transcript": [
    {
      "_id": "2",
      "role": "Tutor",
      "content": "Great! Let's start with a simple example.",
      "annotations": [
        {
          "_id": "2",
          "identifiedBy": "AI",
          "given_praise": "Great!"
        }
      ]
    }
  ]
}
```

### PER_SESSION

Annotations are attached at the session level and describe the entire conversation.

**Use case:** Overall session coding (e.g., session quality, learning outcomes, engagement level).

```json
{
  "transcript": [
    /* utterances */
  ],
  "annotations": [
    {
      "_id": "0",
      "session_quality": "high",
      "learning_outcome": "achieved",
      "engagement_level": 4
    }
  ]
}
```

## Validation and Error Handling

The current upload flow validates transcripts at parse time:

- **CSV:** Rows missing the `session_id` column are rejected with the error `CSV file is missing required "session_id" column`.
- **JSONL:** Lines that fail to parse as JSON are rejected with a parsing error indicating the bad line. Records without a `session_id` field are rejected.
- **Attribute Mapping:** If none of the required fields (`role`, `content`, `sequence_id`) or their aliases are present in the file, the mapping step will fail.

A formal JSON Schema (`transcript.schema.json`) defines the internal transcript structure and is available for validating exported or programmatically-generated session JSON, though it is not currently invoked automatically during the standard upload flow.

## Recommended Limits

Sandpiper does not enforce hard size or count limits, but the following are recommended for predictable performance:

- **File size:** Up to 10MB per file
- **Utterances per session:** Up to 1,000

Files significantly larger than these guidelines may increase processing time, token costs, and the risk of LLM context limits during annotation runs.

## File Naming

Use descriptive file names that identify the dataset or session range. The file name (without extension) is used as the session name when only one session is present in the file.

Examples: `session_001.csv`, `math_tutoring_20240115.jsonl`

## Character Encoding

All upload files should be UTF-8 encoded to support international characters and special punctuation.

## Best Practices

1. **Consistent Session IDs:** Use a stable identifier scheme across sessions so re-uploads and updates can be matched.
2. **Sequential `sequence_id`:** Number utterances starting at `1` and incrementing by `1` within each session.
3. **Consistent Role Names:** Use the same role labels throughout a project (e.g., always `Tutor` and `Student`, not mixed with `Teacher`/`Pupil`).
4. **Preserve Original Text:** Keep original punctuation and capitalization in the `content` field — this matters for annotations that look at linguistic features like questioning or praise.
5. **One Format Per File:** Don't mix CSV and JSONL; pick one and stick with it for the file.

## Related Concepts

- **[Sessions](sessions)** — The unit each transcript becomes after conversion
- **[Files](files)** — Upload, processing, and file management
- **[Run Sets](run-sets)** — Group sessions for annotation
- **[Annotation Type](annotationType)** — PER_UTTERANCE vs PER_SESSION runs
- **[Schema](schema)** — Annotation field structure used by prompts
