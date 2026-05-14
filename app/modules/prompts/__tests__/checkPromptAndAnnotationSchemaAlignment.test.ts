import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAddSystemMessage = vi.fn();
const mockAddUserMessage = vi.fn();
const mockCreateChat = vi
  .fn()
  .mockResolvedValue({ alignmentScore: 1, reasoning: "" });
const mockLLMConstructor = vi.fn();

vi.mock("~/modules/llm/llm", () => ({
  default: class MockLLM {
    constructor(opts: unknown) {
      mockLLMConstructor(opts);
    }
    addSystemMessage = mockAddSystemMessage;
    addUserMessage = mockAddUserMessage;
    createChat = mockCreateChat;
  },
}));

let checkPromptAndAnnotationSchemaAlignment: typeof import("../services/checkPromptAndAnnotationSchemaAlignment.server").default;

beforeEach(async () => {
  vi.resetModules();
  mockAddSystemMessage.mockReset();
  mockAddUserMessage.mockReset();
  mockLLMConstructor.mockReset();
  const mod =
    await import("../services/checkPromptAndAnnotationSchemaAlignment.server");
  checkPromptAndAnnotationSchemaAlignment = mod.default;
});

const baseArgs = {
  userPrompt: "Annotate each utterance with a quality score.",
  annotationSchema: [
    {
      isSystem: false,
      fieldType: "number" as const,
      fieldKey: "quality",
      value: 0,
    },
  ],
  team: "team-1",
  promptId: "prompt-1",
  userId: "user-1",
};

describe("checkPromptAndAnnotationSchemaAlignment", () => {
  it("declares hasInjectionError and injectionReasoning in the JSON schema", async () => {
    await checkPromptAndAnnotationSchemaAlignment(baseArgs);

    const { schema } = mockLLMConstructor.mock.calls[0][0];
    expect(schema.properties.hasInjectionError).toEqual({ type: "boolean" });
    expect(schema.properties.injectionReasoning).toEqual({ type: "string" });
    expect(schema.required).toEqual(
      expect.arrayContaining([
        "alignmentScore",
        "reasoning",
        "hasInjectionError",
        "injectionReasoning",
      ]),
    );
  });

  it("includes the four prompt-injection rules in the system message", async () => {
    await checkPromptAndAnnotationSchemaAlignment(baseArgs);

    const [systemText] = mockAddSystemMessage.mock.calls[0];
    expect(systemText).toMatch(/ignore previous instructions/i);
    expect(systemText).toMatch(/output format/i);
    expect(systemText).toMatch(/system prompt/i);
    expect(systemText).toMatch(/out[- ]of[- ]scope/i);
    expect(systemText).toMatch(/hasInjectionError/);
    expect(systemText).toMatch(/injectionReasoning/);
  });

  it("includes the new fields in the example output JSON", async () => {
    await checkPromptAndAnnotationSchemaAlignment(baseArgs);

    const [, vars] = mockAddSystemMessage.mock.calls[0];
    const example = JSON.parse(vars.output);
    expect(example).toHaveProperty("hasInjectionError");
    expect(example).toHaveProperty("injectionReasoning");
    expect(typeof example.hasInjectionError).toBe("boolean");
    expect(typeof example.injectionReasoning).toBe("string");
  });
});
