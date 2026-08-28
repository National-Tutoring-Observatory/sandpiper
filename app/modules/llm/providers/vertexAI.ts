import { GoogleGenAI } from "@google/genai";
import registerLLM from "../helpers/registerLLM.js";

// GCP labels must be lowercase letters/digits/-/_ and <=63 chars — unlike
// aiGateway.ts's freeform LiteLLM tag strings, a malformed label here fails
// the whole generateContent call, not just the tagging.
function sanitizeLabelValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 63);
}

registerLLM("VERTEX_AI", {
  init: (config?: { timeout?: number }) => {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.VERTEX_AI_PROJECT,
      location: process.env.VERTEX_AI_LOCATION,
      httpOptions: { timeout: config?.timeout ?? 180_000 },
    });
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

    // Cost-attribution labels — shows up as a "Group by: Label" dimension
    // in Cloud Billing Reports, so Vertex spend from this project can be
    // separated from other things running in the same GCP project.
    const labels: Record<string, string> = {
      app: "sandpiper",
      environment: sanitizeLabelValue(env),
    };
    if (team) labels.team = sanitizeLabelValue(team);
    if (billingEventId)
      labels["billing-event-id"] = sanitizeLabelValue(billingEventId);

    // Gemini has no "system" role message — system instructions are a
    // separate top-level field, and the remaining roles are "user"/"model"
    // rather than OpenAI's "user"/"assistant".
    const systemMessages = messages.filter(
      (message) => message.role === "system",
    );
    const conversationMessages = messages.filter(
      (message) => message.role !== "system",
    );

    const contents = conversationMessages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

    // Gemini's structured-output config shape (responseMimeType/responseSchema)
    // is unrelated to applySchemaToRequest's OpenAI response_format shape, so
    // it's built inline here rather than shared with the other providers.
    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      labels,
    };
    if (schema) generationConfig.responseSchema = schema;
    if (systemMessages.length > 0) {
      generationConfig.systemInstruction = systemMessages
        .map((message) => message.content)
        .join("\n\n");
    }

    const response = await llm.models.generateContent({
      model,
      contents,
      config: generationConfig,
    });

    const content = JSON.parse(response.text);

    return {
      content,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        providerCost: 0,
      },
    };
  },
});
