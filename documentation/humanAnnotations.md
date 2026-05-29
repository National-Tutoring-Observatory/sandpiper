---
title: "Human Annotations"
tags: ["human-annotations", "runs", "evaluation"]
category: "Analysis"
isPublished: true
---

# Human Annotations

## Overview

**Human Annotations** allow you to upload manually coded labels into Sandpiper, creating **Human Runs** that can be directly compared against LLM runs in an **Evaluation**. This is essential for measuring the accuracy of LLM annotations against a human gold standard.

When you upload a CSV of human annotations, Sandpiper validates the data, matches it to the sessions in your **Run Set**, and creates one human run per annotator. These human runs then appear alongside LLM runs in the evaluation, enabling calculation of **Precision**, **Recall**, **F1**, and **Cohen's Kappa** between human and LLM annotators.

## How to use

### Downloading the Annotation Template

1.  **Open a Run Set:** Navigate to the **Run Set** where you want to add human labels.
2.  **Download Template:** From the Run Set dropdown menu, click **"Download Annotation Template"**. You can configure how many annotator slots to include per field before generating the CSV.
3.  **Review the Template:** The generated CSV includes these columns:
    - `session_id` — the session identifier
    - `sequence_id` — the position of the utterance within the session
    - `role` — the speaker role (e.g. Tutor, Student)
    - `content` — the utterance text
    - One annotation column per annotator per field, using the naming format `annotator[<name>][<slot>]<fieldKey>` (for example, `annotator[joe][0]TUTOR_MOVE`)

### Annotating the CSV

1.  **Fill in Labels:** Open the CSV in a spreadsheet editor and fill in the annotator columns with your human labels.
2.  **Multiple Annotators:** Each unique annotator name in the column headers becomes its own human run. Sandpiper detects annotators automatically from the `annotator[<name>][<slot>]<field>` format.
3.  **Match Schema Codes:** Values in annotation columns should match the codes defined in your **Prompt Schema** (e.g., `PRAISE`, `NOT_PRAISE`) for meaningful comparisons. Sandpiper accepts any string value, but mismatched codes won't align with LLM runs during evaluation.

### Uploading the CSV

1.  **Open the Upload Dialog:** From the **Run Set** dropdown menu, click **"Upload Human Annotations"**.
2.  **Select the CSV:** Choose your completed CSV file. Sandpiper analyzes it and displays a validation summary:
    - **Annotators** — the annotators detected from column headers, and how many runs will be created
    - **Annotation Fields** — the fields that will be imported
    - **Matched sessions** — sessions in the CSV that match a session in the run set
    - **Unmatched sessions** — session IDs in the CSV that don't match any run set session
    - **Missing sessions** — sessions in the run set that aren't covered by the CSV
3.  **Confirm Upload:** Review the analysis results and confirm the upload to create the human runs.
4.  **Processing:** Sandpiper processes the annotations in the background and adds the human runs to the run set. Each human annotation is stored with `identifiedBy: "HUMAN"` to distinguish it from LLM-generated annotations.

### Using Human Runs in Evaluations

Once human runs are added to a run set:

1.  **Create an Evaluation:** From the **Evaluation** tab, create a new evaluation that includes both human and LLM runs.
2.  **Set Human Run as Base:** Select a human run as the **Base Run** to calculate accuracy metrics (Precision, Recall, F1) for all other runs.
3.  **Compare Results:** The evaluation will show agreement scores between all run pairs, with human labels serving as ground truth.

## Related Concepts

- **[Run Sets](run-sets)** — Where human annotations are uploaded and compared
- **[Runs](runs)** — Human runs appear alongside LLM runs
- **[Evaluation Equations](evaluation-equations)** — The metrics used to compare runs
- **[Schema](schema)** — Defines the annotation fields for the template
- **[Adjudication](adjudication)** — Resolve disagreements after human/LLM comparison
