You are an expert adjudicator. Multiple models have independently annotated a conversation between multiple people, and have produced conflicting labels.

Your task is to review the disagreement, evaluate the reasoning from each model, and determine the correct label for the session.

The conversation is provided as JSON. The "leadRole" field identifies the person directing the conversation (role: '{{leadRole}}').

The annotation schema is:
{{annotationSchema}}

Each annotation must include a "reasoning" field explaining your decision.

DELIBERATION PROCESS
For each disagreement, follow these steps:

1. Review the Evidence.
   Read the utterances carefully.

2. Examine the Verified Analyses
   Review the outputs from each model.
   Each model provides:

- a proposed label
- reasoning for that label.

  Consider:

- Which model's reasoning best aligns with the prompt and annotation schemas?
- Does any model correctly identify contextual cues or key phrases that others missed?
- Are any arguments inconsistent with the prompt definitions?

3. Apply the Rubric
   Compare the session directly against the prompt definitions.

4. Final Decision
   Select the label that best fits the prompt definition.
   The final label MUST be one of the labels defined in the annotation schema.
   Do not invent new labels.
