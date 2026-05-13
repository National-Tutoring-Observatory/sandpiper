import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/modules/prompts/prompt", () => ({
  PromptService: {
    findById: vi.fn(async () => ({
      _id: "prompt1",
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
    })),
  },
}));

vi.mock("~/modules/prompts/promptVersion", () => ({
  PromptVersionService: {
    findOne: vi.fn(async () => ({
      _id: "promptVersion1",
      version: 3,
      userPrompt: "Some user prompt text",
      annotationSchema: [{ field: "foo" }],
    })),
  },
}));

vi.mock("~/modules/llm/modelRegistry", () => ({
  findModelByCode: vi.fn(() => ({
    name: "GPT-4o",
    provider: "openai",
  })),
}));

vi.mock("~/modules/prompts/helpers/getSystemPrompt", () => ({
  default: vi.fn(
    (kind: string, annotationType: string) =>
      `SYSTEM PROMPT (${kind}, ${annotationType})`,
  ),
}));

import buildRunSnapshot from "../services/buildRunSnapshot.server";

describe("buildRunSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseArgs = {
    promptId: "prompt1",
    promptVersionNumber: 3,
    modelCode: "gpt-4o",
    annotationType: "PER_UTTERANCE" as const,
    shouldRunVerification: false,
    isAdjudication: false,
  };

  it("captures the annotation system prompt", async () => {
    const snapshot = await buildRunSnapshot(baseArgs);
    expect(snapshot.prompt.systemPrompt).toBe(
      "SYSTEM PROMPT (annotation, PER_UTTERANCE)",
    );
  });

  it('leaves verifySystemPrompt as "" when shouldRunVerification is false', async () => {
    const snapshot = await buildRunSnapshot(baseArgs);
    expect(snapshot.prompt.verifySystemPrompt).toBe("");
  });

  it('leaves adjudicateSystemPrompt as "" when isAdjudication is false', async () => {
    const snapshot = await buildRunSnapshot(baseArgs);
    expect(snapshot.prompt.adjudicateSystemPrompt).toBe("");
  });

  it("captures the verify system prompt when shouldRunVerification is true", async () => {
    const snapshot = await buildRunSnapshot({
      ...baseArgs,
      shouldRunVerification: true,
    });
    expect(snapshot.prompt.verifySystemPrompt).toBe(
      "SYSTEM PROMPT (verify, PER_UTTERANCE)",
    );
    expect(snapshot.prompt.adjudicateSystemPrompt).toBe("");
  });

  it("captures the adjudicate system prompt when isAdjudication is true", async () => {
    const snapshot = await buildRunSnapshot({
      ...baseArgs,
      isAdjudication: true,
    });
    expect(snapshot.prompt.adjudicateSystemPrompt).toBe(
      "SYSTEM PROMPT (adjudicate, PER_UTTERANCE)",
    );
    expect(snapshot.prompt.verifySystemPrompt).toBe("");
  });

  it("captures all three system prompts when both flags are true", async () => {
    const snapshot = await buildRunSnapshot({
      ...baseArgs,
      shouldRunVerification: true,
      isAdjudication: true,
    });
    expect(snapshot.prompt.systemPrompt).toBe(
      "SYSTEM PROMPT (annotation, PER_UTTERANCE)",
    );
    expect(snapshot.prompt.verifySystemPrompt).toBe(
      "SYSTEM PROMPT (verify, PER_UTTERANCE)",
    );
    expect(snapshot.prompt.adjudicateSystemPrompt).toBe(
      "SYSTEM PROMPT (adjudicate, PER_UTTERANCE)",
    );
  });

  it("uses the provided annotationType for system prompt lookups", async () => {
    const snapshot = await buildRunSnapshot({
      ...baseArgs,
      annotationType: "PER_SESSION",
      shouldRunVerification: true,
    });
    expect(snapshot.prompt.systemPrompt).toBe(
      "SYSTEM PROMPT (annotation, PER_SESSION)",
    );
    expect(snapshot.prompt.verifySystemPrompt).toBe(
      "SYSTEM PROMPT (verify, PER_SESSION)",
    );
  });

  it("preserves the existing user-prompt and model fields", async () => {
    const snapshot = await buildRunSnapshot(baseArgs);
    expect(snapshot.prompt.name).toBe("Test Prompt");
    expect(snapshot.prompt.userPrompt).toBe("Some user prompt text");
    expect(snapshot.prompt.version).toBe(3);
    expect(snapshot.model).toEqual({
      code: "gpt-4o",
      name: "GPT-4o",
      provider: "openai",
    });
  });
});
