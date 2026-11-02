import Anthropic from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import { Agent } from "undici";
import applySchemaToRequest from "../helpers/applySchemaToRequest";
import registerLLM from "../helpers/registerLLM";
import type { Providers } from "../model.types";

const keepAliveDispatcher = new Agent({
  keepAliveTimeout: 600_000,
  keepAliveMaxTimeout: 600_000,
  connect: {
    keepAlive: true,
    keepAliveInitialDelay: 30_000,
  },
});

registerLLM("AI_GATEWAY", {
  init: (config: { timeout?: number; provider: Providers }) => {
    if (config.provider === "Anthropic") {
      const anthropic = new Anthropic({
        apiKey: process.env.AI_GATEWAY_KEY,
        baseURL: process.env.AI_GATEWAY_BASE_URL,
        maxRetries: 0,
        timeout: config?.timeout ?? 180_000,
        fetchOptions: { dispatcher: keepAliveDispatcher },
      });
      return anthropic;
    }
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

    const requestParams: Record<string, unknown> =
      options.provider === "Anthropic"
        ? {
            user: team,
            model,
            messages,
            max_tokens: 16000,
            metadata: { user_id: team },
            stream: true,
          }
        : {
            user: team,
            model: model,
            messages: messages,
            metadata,
            stream: true,
            stream_options: { include_usage: true },
          };

    applySchemaToRequest({ requestParams, schema, provider: options.provider });

    let stream;
    let response;

    if (options.provider === "Anthropic") {
      const { data, response: llmResponse } = await llm.messages
        .create(requestParams)
        .withResponse();
      stream = data;
      response = llmResponse;
    } else {
      const { data, response: llmResponse } = await llm.chat.completions
        .create(requestParams)
        .withResponse();
      stream = data;
      response = llmResponse;
    }

    let contentStr = "";
    let usage: { prompt_tokens?: number; completion_tokens?: number } = {};

    if (options.provider === "Anthropic") {
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          contentStr += event.delta.text;
        }
        if (event.type === "message_start") {
          usage.prompt_tokens = event.message.usage.input_tokens;
        }
        if (event.type === "message_delta") {
          usage.completion_tokens = event.usage.output_tokens;
        }
      }
    } else {
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (delta?.content) {
          contentStr += delta.content;
        }
        if (chunk.usage) {
          usage = chunk.usage;
        }
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
