---
title: "Adjudication"
tags: ["adjudication", "evaluation", "runs"]
category: "Analysis"
isPublished: true
---

# Adjudication

## Overview

**Adjudication** is the process of resolving annotation disagreements between multiple **Runs**. When different LLM models or prompt configurations produce conflicting annotations for the same data, adjudication uses an LLM to review the disagreements and produce a consensus annotation.

An **Adjudication Run** is a special type of run that takes two or more source runs as input, identifies utterances or sessions where the source runs disagree, and uses an LLM to vote on the correct annotation. The result is a new run containing the adjudicated consensus annotations.

After the adjudication run completes, Sandpiper automatically re-runs the **Evaluation** to include the adjudicated results, showing how the consensus compares to the original runs.

## How to use

### Starting an Adjudication

Adjudication is initiated from the **Evaluation** tab of a **Run Set**.

1.  **Run an Evaluation:** First, create an evaluation in your run set to compare your runs and identify disagreements.
2.  **Review Results:** Examine the pairwise agreement matrix to see where runs disagree.
3.  **Open the Adjudication Dialog:** Click **"Improve via adjudication"** from the evaluation results page.
4.  **Select Source Runs:** The dialog pre-selects the top 3 non-human runs by Kappa score against your base run. You can check or uncheck runs to customize the selection. A minimum of 2 runs is required.
5.  **Choose an Adjudicator Model:** Select the LLM model that will resolve disagreements. The default model is pre-loaded, but you can swap in any configured provider model.
6.  **Start the Run:** Click **"Start adjudication"** to launch the run.

### How Adjudication Works

1.  **Disagreement Detection:** Sandpiper compares annotations across the selected source runs and identifies utterances or sessions where they disagree.
2.  **Agreement Pass-through:** Where all source runs already agree, the consensus annotation is copied through directly — no LLM call is made for unanimous results.
3.  **LLM Voting:** For each remaining disagreement, the adjudicator LLM reviews the source annotations alongside the original transcript content, then votes on which annotation is correct.
4.  **Consensus Output:** A new run is created with one consensus annotation per utterance or session. The run is named after the adjudicator model (e.g. "Adjudication - Claude Sonnet 4.6") and flagged as an adjudication run.
5.  **Automatic Re-evaluation:** Once the adjudication run finishes successfully, Sandpiper automatically re-runs the evaluation to include it alongside the originals.

### Interpreting Adjudication Results

In the updated evaluation:

- The adjudication run appears alongside the original runs in the pairwise agreement matrix.
- Compare the adjudication run's agreement with each source run to understand which runs were closest to the consensus.
- If human labels are available, compare the adjudication run against human ground truth to measure its accuracy.

## Related Concepts

- **[Run Sets](run-sets)** — Where adjudication is initiated
- **[Runs](runs)** — Adjudication runs are a special run type
- **[Evaluation Equations](evaluation-equations)** — Metrics used to measure agreement
- **[Human Annotations](humanAnnotations)** — Compare adjudicated results against human labels
