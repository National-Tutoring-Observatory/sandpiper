import { OpenAI } from "openai";
import { Agent } from "undici";
import applySchemaToRequest from "../helpers/applySchemaToRequest";
import registerLLM from "../helpers/registerLLM";

const keepAliveDispatcher = new Agent({
  keepAliveTimeout: 600_000,
  keepAliveMaxTimeout: 600_000,
  connect: {
    keepAlive: true,
    keepAliveInitialDelay: 30_000,
  },
});

registerLLM("AI_GATEWAY", {
  init: (config?: { timeout?: number }) => {
    const openai = new OpenAI({
      apiKey: process.env.AI_GATEWAY_KEY,
      baseURL: process.env.AI_GATEWAY_BASE_URL,
      maxRetries: 0,
      timeout: config?.timeout ?? 180_000,
      fetchOptions: { dispatcher: keepAliveDispatcher },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: any;
    messages: Array<{ role: string; content: string }>;
    schema?: object;
  }) => {
    const { model, team, billingEventId } = options;
    const env = process.env.DEPLOY_ENV || process.env.NODE_ENV || "development";

    const prefix = `sandpiper.${env}`;
    const tags: string[] = [];
    if (team) tags.push(`${prefix}.team.${team}`);
    if (billingEventId) tags.push(`${prefix}.billing.${billingEventId}`);

    const metadata: Record<string, unknown> = {};
    if (tags.length > 0) metadata.tags = tags;

    const requestParams: Record<string, unknown> = {
      user: team,
      model: model,
      messages: messages,
      metadata,
      stream: true,
      stream_options: { include_usage: true },
    };

    applySchemaToRequest(requestParams, schema);

    const { data: stream, response } = await llm.chat.completions
      .create(requestParams)
      .withResponse();

    let contentStr = "";
    let usage: { prompt_tokens?: number; completion_tokens?: number } = {};

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        contentStr += delta.content;
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    const content = JSON.parse(contentStr);

    const providerCostHeader = response.headers.get("x-litellm-response-cost");

    return {
      content,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        providerCost:
          providerCostHeader && Number.isFinite(parseFloat(providerCostHeader))
            ? parseFloat(providerCostHeader)
            : 0,
      },
    };
  },
});
