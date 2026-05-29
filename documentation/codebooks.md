---
title: "Codebooks"
tags: ["codebooks", "prompts"]
category: "Configuration"
isPublished: true
---

# Codebooks

## Overview

A **Codebook** is a structured classification scheme that defines the categories, codes, and definitions used to annotate tutoring transcripts. Codebooks bring rigor and consistency to annotation by providing a shared vocabulary and set of examples that guide both human annotators and LLMs.

Each codebook contains **Categories** (broad groupings), **Codes** (specific labels within a category), and **Examples** (illustrative instances of each code). Codebooks support **Versioning**, allowing you to refine your classification scheme over time while preserving previous versions for reproducibility.

A key feature of codebooks is the ability to **auto-generate Prompts** directly from a codebook's definitions and examples. This bridges the gap between your coding scheme and the LLM instructions, ensuring alignment between what you intend to measure and what the LLM looks for.

## How to use

### Creating a Codebook

1.  **Navigate to Codebooks:** Open the **Codebooks** link in the main sidebar under "Content". Codebooks are scoped to your team — only members of the same team can view or edit them.
2.  **Create a Codebook:** Click **"Create codebook"** and fill in the **Name** and **Intention** fields (the Intention describes what this codebook is for).
3.  **Open the Editor:** The codebook editor opens with an initial version ready for your categories and codes.

### Defining Categories and Codes

In the codebook editor:

1.  **Add a Category:** Create a broad grouping (e.g., "Instructional Moves," "Student Responses").
2.  **Add Codes:** Within each category, define specific codes (e.g., "Praise," "Scaffolding," "Probing Question").
3.  **Write Definitions:** For each code, write a clear definition explaining what it means and when it applies.
4.  **Add Examples:** Provide examples for each code. Each example is tagged with one of four types:

| Example Type  | Description                                |
| ------------- | ------------------------------------------ |
| **HIT**       | A clear, unambiguous example of the code   |
| **NEAR_HIT**  | A borderline example that still qualifies  |
| **NEAR_MISS** | A borderline example that does not qualify |
| **MISS**      | A clear example of what the code is not    |

5.  **Save the Version:** Click **"Save codebook version"** and confirm in the dialog to persist your changes.

### Versioning

1.  **Create a New Version:** Click the **+** button next to the version list to create a copy of the current version for editing. The original version is preserved, and the new version is auto-named with an incrementing identifier.
2.  **Make Production Version:** When you're satisfied with a version, click **"Make production version"** in the editor to designate it as the active default for prompt generation. The current production version displays a "Production" badge.

### Generating a Prompt from a Codebook

1.  **Open the Codebook:** Navigate to the codebook version you want to use.
2.  **Click "Create prompt":** Opens the **"Create prompt from codebook"** dialog.
3.  **Choose an Annotation Type:** Select whether the generated prompt should annotate `PER_UTTERANCE` (default) or `PER_SESSION`.
4.  **Generate:** Sandpiper sends your codebook's categories, codes, definitions, and examples to an LLM, which drafts an annotation prompt.
5.  **Review the Prompt:** The generated prompt opens in the **Prompt** editor. Review and refine the instructions before saving.
6.  **Link is Preserved:** The new prompt version stores a reference to the source codebook and version for traceability.

## External Guides

- **[Prompt Writing Guide](https://docs.google.com/document/d/1Rf2p3ltWSCk3VTeuTtXTpVu7NkrAi8yNDloYLId-KU8/edit)** — Covers how codebook-generated prompts work and best practices for annotation schema

## Related Concepts

- **[Prompts](prompts)** — The instructions generated from or inspired by codebooks
- **[Prompt Versions](promptVersions)** — Track revisions to codebook-generated prompts
- **[Schema](schema)** — The structured output fields, often derived from codebook codes
- **[Annotation Type](annotationType)** — How the LLM applies the codebook-derived prompt
