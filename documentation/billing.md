---
title: "Billing and Credits"
tags: ["billing", "credits", "teams"]
category: "Collaboration"
isPublished: true
---

# Billing and Credits

## Overview

Sandpiper uses a **credit-based billing system** to manage the cost of LLM annotations. Every time a **Run** is executed, the LLM API calls consume credits based on the number of tokens processed and the model used. Credits are managed at the **Team** level, meaning all members of a team share a common credit balance.

Each team is assigned a **Billing Plan** that determines the markup rate applied to raw provider costs. Teams can purchase additional credits via **Stripe** or receive credits from administrators.

## Key Concepts

| Concept            | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| **Credits**        | The currency used to pay for LLM operations in Sandpiper           |
| **Billing Plan**   | Determines pricing markup for a team                               |
| **Billing Period** | A time window that tracks costs and credit usage                   |
| **Provider Cost**  | The raw cost charged by the LLM provider (e.g., OpenAI, Anthropic) |
| **Billed Amount**  | The provider cost with the team's billing plan markup applied      |

## How to use

### Viewing Your Balance

1.  **Navigate to Team Billing:** Go to your **Team** page and click the "Billing" tab.
2.  **View Balance:** Your current credit balance is displayed at the top of the page, along with recent usage.

### Purchasing Credits

1.  **Top Up:** From the billing page, click **"Top up"**.
2.  **Stripe Checkout:** Confirm the amount, then click **"Continue to checkout"** to be redirected to Stripe.
3.  **Credits Applied:** Once the payment is processed, credits are immediately added to your team's balance and a confirmation toast appears on return.

> **Admin note:** A separate **"Add credits"** button is available to super admins for manually granting credits to a team without going through Stripe — for example, when issuing research credits or refunds.

### Understanding Costs

Costs are tracked across several categories:

| Cost Source                    | Description                                               |
| ------------------------------ | --------------------------------------------------------- |
| **Annotation (per session)**   | LLM calls for per-session annotation runs                 |
| **Annotation (per utterance)** | LLM calls for per-utterance annotation runs               |
| **Verification**               | Self-verification of annotation quality                   |
| **Adjudication**               | LLM calls to resolve annotation disagreements             |
| **File Conversion**            | LLM calls during transcript parsing                       |
| **Attribute Mapping**          | LLM calls to detect column mappings during file upload    |
| **Codebook Generation**        | LLM calls to generate prompts from codebooks              |
| **Prompt Alignment**           | LLM calls to align prompt schemas with codebook structure |

### Cost Estimation

Before starting a run, Sandpiper provides a cost estimate based on:

- The number of **Sessions** to annotate
- The **input token count** of each session
- The pricing tiers of the selected **LLM Model**

If your team has insufficient credits, you will see a warning that estimated cost exceeds your remaining balance. You can acknowledge the warning ("I understand and want to proceed") and start the run anyway, or top up credits first. Runs may fail mid-execution if credits are exhausted.

### Spend Analytics and History

The billing page also surfaces:

- **Spend Analytics** — usage broken down by model and over time, with day/week/month granularity
- **Credit History** — searchable record of all credit transactions, including who added credits and the Stripe session ID for reconciliation
- **Billing Period History** — closed billing periods showing raw cost, billed amount with markup applied, and closing balance

## Related Concepts

- **[Teams](teams)** — Credits are managed at the team level
- **[Runs](runs)** — Where credits are consumed
- **[LLM Costs](llmCosts)** — Detailed cost tracking and analytics
- **[LLM Providers](llmProviders)** — The models and providers that determine pricing
