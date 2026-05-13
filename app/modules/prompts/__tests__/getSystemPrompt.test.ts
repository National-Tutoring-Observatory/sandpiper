import { describe, expect, it } from "vitest";
import getSystemPrompt from "../helpers/getSystemPrompt";

describe("getSystemPrompt", () => {
  it("returns the annotation per-utterance prompt", () => {
    const prompt = getSystemPrompt("annotation", "PER_UTTERANCE");
    expect(prompt).toContain(
      'Each annotation must include an "\\_id" that exactly matches',
    );
  });

  it("returns the annotation per-session prompt", () => {
    const prompt = getSystemPrompt("annotation", "PER_SESSION");
    expect(prompt).toContain("Look over the whole session");
  });

  it("returns the verify per-utterance prompt", () => {
    const prompt = getSystemPrompt("verify", "PER_UTTERANCE");
    expect(prompt).toContain("Annotation Quality Auditor");
  });

  it("returns the verify per-session prompt", () => {
    const prompt = getSystemPrompt("verify", "PER_SESSION");
    expect(prompt.length).toBeGreaterThan(0);
  });

  it("returns the adjudicate per-utterance prompt", () => {
    const prompt = getSystemPrompt("adjudicate", "PER_UTTERANCE");
    expect(prompt).toContain("expert adjudicator");
  });

  it("returns the adjudicate per-session prompt", () => {
    const prompt = getSystemPrompt("adjudicate", "PER_SESSION");
    expect(prompt).toContain("expert adjudicator");
  });

  it("returns an empty string when annotationType is falsy", () => {
    // @ts-expect-error - intentionally testing defensive fallback
    expect(getSystemPrompt("annotation", undefined)).toBe("");
    // @ts-expect-error - intentionally testing defensive fallback
    expect(getSystemPrompt("annotation", "")).toBe("");
  });

  it("returns different content for annotation vs verify (PER_UTTERANCE)", () => {
    const annotation = getSystemPrompt("annotation", "PER_UTTERANCE");
    const verify = getSystemPrompt("verify", "PER_UTTERANCE");
    expect(annotation).not.toBe(verify);
  });
});
