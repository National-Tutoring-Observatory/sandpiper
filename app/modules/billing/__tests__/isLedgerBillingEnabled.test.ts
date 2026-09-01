import { afterEach, describe, expect, it } from "vitest";
import isLedgerBillingEnabled from "../helpers/isLedgerBillingEnabled";

describe("isLedgerBillingEnabled", () => {
  const originalProvider = process.env.LLM_PROVIDER;

  afterEach(() => {
    if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
    else process.env.LLM_PROVIDER = originalProvider;
  });

  it("is disabled for Vertex AI, which bills the GCP project directly", () => {
    expect(isLedgerBillingEnabled("VERTEX_AI")).toBe(false);
  });

  it("is enabled for gateway deployments", () => {
    expect(isLedgerBillingEnabled("AI_GATEWAY")).toBe(true);
  });

  it("fails closed when the provider is unknown to the caller", () => {
    // Client bundles have no process.env, so an omitted provider must keep
    // billing enforced rather than silently disable the credit gates.
    expect(isLedgerBillingEnabled("")).toBe(true);
  });

  it("reads the active provider from env when no argument is given", () => {
    process.env.LLM_PROVIDER = "VERTEX_AI";
    expect(isLedgerBillingEnabled()).toBe(false);

    process.env.LLM_PROVIDER = "AI_GATEWAY";
    expect(isLedgerBillingEnabled()).toBe(true);
  });
});
