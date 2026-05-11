import { describe, expect, it } from "vitest";
import getSystemPromptByAnnotationType from "../helpers/getSystemPromptByAnnotationType";

describe("getSystemPromptByAnnotationType", () => {
  it("returns the per-session prompt for PER_SESSION", () => {
    const prompt = getSystemPromptByAnnotationType("PER_SESSION");
    expect(prompt).toContain("Look over the whole session");
  });

  it("returns the per-utterance prompt for PER_UTTERANCE", () => {
    const prompt = getSystemPromptByAnnotationType("PER_UTTERANCE");
    expect(prompt).toContain(
      'Each annotation must include an "\\_id" that exactly matches',
    );
  });

  it("returns different content for each type", () => {
    const perSession = getSystemPromptByAnnotationType("PER_SESSION");
    const perUtterance = getSystemPromptByAnnotationType("PER_UTTERANCE");
    expect(perSession).not.toBe(perUtterance);
  });
});
