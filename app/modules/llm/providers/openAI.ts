import { OpenAI } from "openai";
import applySchemaToRequest from "../helpers/applySchemaToRequest.js";
import registerLLM from "../helpers/registerLLM.js";

registerLLM("OPEN_AI", {
  init: (config?: { timeout?: number }) => {
    const openai = new OpenAI({
      apiKey: process.env.OPEN_AI_KEY,
      maxRetries: 0,
      timeout: config?.timeout ?? 180_000,
    });
    return openai;
  },
  createChat: async ({
    llm,
    options,
    messages,
    schema,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    llm: any;
    options: { model: string };
    messages: Array<{ role: string; content: string }>;
    schema?: object;
  }) => {
    const requestParams: Record<string, unknown> = {
      model: options.model,
      messages: messages,
    };

    applySchemaToRequest(requestParams, schema);

    const chatCompletion = await llm.chat.completions.create(requestParams);
    const message = chatCompletion.choices[0].message;

    const content = JSON.parse(message.content);

    return {
      content,
      usage: {
        inputTokens: chatCompletion.usage?.prompt_tokens ?? 0,
        outputTokens: chatCompletion.usage?.completion_tokens ?? 0,
        providerCost: 0,
      },
    };
  },
});
