// Vertex AI spend bills straight to the GCP project (see the cost-attribution
// labels in llm/providers/vertexAI.ts) rather than through a team's
// Stripe-funded ledger, so credit balances and plan markups don't govern
// anything on that deploy — gating runs on them just blocks every run.
//
// `process.env` is replaced with `{}` in the client bundle, so browser callers
// must pass the provider down from the root loader (see llm/hooks/
// useLlmProvider). Omitting it there fails closed: billing stays enforced.
export default function isLedgerBillingEnabled(
  llmProvider: string = process.env.LLM_PROVIDER || "",
): boolean {
  return llmProvider !== "VERTEX_AI";
}
