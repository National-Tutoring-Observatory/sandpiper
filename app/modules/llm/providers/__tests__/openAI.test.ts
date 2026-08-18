import { beforeEach, describe, expect, it, vi } from "vitest";
import getLLM from "../../helpers/getLLM";
import "../openAI.js";

function getOpenAIMethods() {
  const provider = getLLM("OPEN_AI");
  if (!provider) throw new Error("OPEN_AI provider was not registered");
  return provider.methods;
}

function makeFakeClient(create: ReturnType<typeof vi.fn>) {
  return { chat: { completions: { create } } };
}

const completion = {
  choices: [{ message: { content: JSON.stringify({ result: "ok" }) } }],
  usage: { prompt_tokens: 120, completion_tokens: 30 },
};

describe("openAI provider", () => {
  let create: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue(completion);
  });

  it("calls the model it was asked for", async () => {
    // Billing prices options.model in writeCostRecord, so calling anything else
    // means we charge for one model and run another.
    await getOpenAIMethods().createChat({
      llm: makeFakeClient(create),
      options: { model: "gpt-5.6-luna" },
      messages: [{ role: "user", content: "hi" }],
    });

    expect(create).toHaveBeenCalledOnce();
    expect(create.mock.calls[0][0].model).toBe("gpt-5.6-luna");
  });

  it("does not fall back to a hardcoded model", async () => {
    await getOpenAIMethods().createChat({
      llm: makeFakeClient(create),
      options: { model: "gpt-5.6-terra" },
      messages: [{ role: "user", content: "hi" }],
    });

    expect(create.mock.calls[0][0].model).not.toBe("gpt-4o");
  });

  it("returns parsed content and token usage", async () => {
    const result = await getOpenAIMethods().createChat({
      llm: makeFakeClient(create),
      options: { model: "gpt-5.6-luna" },
      messages: [{ role: "user", content: "hi" }],
    });

    expect(result.content).toEqual({ result: "ok" });
    expect(result.usage).toEqual({
      inputTokens: 120,
      outputTokens: 30,
      providerCost: 0,
    });
  });
});
