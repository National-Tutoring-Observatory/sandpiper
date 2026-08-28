import aiGatewayConfigRaw from "~/config/ai_gateway.json";
import type { ModelInfo, PricingTier, Provider } from "./model.types";

interface ModelConfig {
  defaultModel: string;
  providers: Array<{
    name: string;
    models: Array<{
      code: string;
      name: string;
      deprecated?: boolean;
      pricing: PricingTier[];
    }>;
  }>;
}

const aiGatewayConfig = aiGatewayConfigRaw as unknown as ModelConfig;

export function getDefaultModelCode(): string {
  // The gateway's default is a "nto."-prefixed LiteLLM code, which Vertex's
  // raw generateContent call won't recognize — fall back to that provider's
  // own model list instead.
  if (process.env.LLM_PROVIDER === "VERTEX_AI") {
    const vertexProvider = aiGatewayConfig.providers.find(
      (provider) => provider.name === "Vertex AI",
    );
    const defaultVertexModel = vertexProvider?.models.find(
      (model) => !model.deprecated,
    );
    if (defaultVertexModel) return defaultVertexModel.code;
  }

  return aiGatewayConfig.defaultModel;
}

export function getAvailableProviders(): Provider[] {
  return aiGatewayConfig.providers
    .map((provider) => ({
      name: provider.name,
      models: provider.models
        .filter((m) => !m.deprecated)
        .map((m) => ({
          code: m.code,
          name: m.name,
          pricing: m.pricing,
        })),
    }))
    .filter((provider) => provider.models.length > 0);
}

export function getAvailableModels(): ModelInfo[] {
  return aiGatewayConfig.providers.flatMap((provider) =>
    provider.models
      .filter((m) => !m.deprecated)
      .map((m) => ({
        code: m.code,
        name: m.name,
        provider: provider.name,
        pricing: m.pricing,
      })),
  );
}

export function findModelByCode(
  code: string,
  { includeDeprecated = false }: { includeDeprecated?: boolean } = {},
): ModelInfo | null {
  for (const provider of aiGatewayConfig.providers) {
    const model = provider.models.find((m) => m.code === code);
    if (model && (includeDeprecated || !model.deprecated)) {
      return {
        code: model.code,
        name: model.name,
        provider: provider.name,
        pricing: model.pricing,
        deprecated: model.deprecated,
      };
    }
  }
  return null;
}

export function getModelPricing(code: string): PricingTier[] {
  const model = findModelByCode(code);
  return model?.pricing ?? [];
}
