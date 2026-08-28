---
title: "LLM Providers"
tags: ["llm", "providers", "infrastructure"]
category: "Configuration"
isPublished: true
---

# LLM Providers

## Overview

Sandpiper supports multiple **LLM providers** for annotation, verification, and adjudication tasks. The application abstracts provider-specific details behind a common interface, allowing you to choose the best model for your annotation needs.

Depending on how a given deployment is configured, LLM calls are routed through one of:

- **Cornell University's Secure AI Gateway** — a university-managed proxy giving access to models from Anthropic, OpenAI, and Google, ensuring your data is never stored or used by the underlying model providers.
- **A direct OpenAI connection.**
- **A direct Google Vertex AI connection** — used by deployments hosted on Google Cloud.

Only one provider is active per deployment; the model dropdown only shows models available through whichever provider your instance uses.

## Supported Providers

Depending on the active provider, Sandpiper gives access to models from:

- **Anthropic** — Claude models (via AI Gateway)
- **OpenAI** — GPT models (via AI Gateway or a direct connection)
- **Google** — Gemini models (via AI Gateway or a direct Vertex AI connection)

Each model has a **tiered pricing structure** based on input and output token counts, which is used to calculate costs and provide estimates before running annotations.

## How to use

### Selecting a Model

1.  **Configure a Run:** When creating a new **Run** or defining runs in a **Run Set**, select the LLM model from the model dropdown.
2.  **Review Pricing:** The cost estimate displayed before starting a run reflects the selected model's pricing tiers.
3.  **Compare Models:** Use **Run Sets** and **Evaluations** to compare annotation quality across different models on the same data.

### Model Registry

Sandpiper maintains a registry of available models with their pricing information. Models can be marked as deprecated when newer versions become available.

## Related Concepts

- **[Runs](runs)** — Where LLM models are selected and applied
- **[LLM Costs](llmCosts)** — Cost tracking across models
- **[Billing and Credits](billing)** — How model usage is billed
- **[Privacy Policy](privacyPolicy)** — How the AI Gateway protects your data
