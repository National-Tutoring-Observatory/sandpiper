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

export const VERTEX_AI_PROVIDER_NAME = "Vertex AI";

// Vite replaces `process.env` with `{}` in the client bundle, so this reads as
// unset in the browser — client callers pass the value down from the root
// loader instead (see hooks/useLlmProvider).
function getActiveLlmProvider(): string {
  return process.env.LLM_PROVIDER || "";
}

// The "Vertex AI" block holds bare model codes that only the direct Vertex
// provider can resolve (it calls publishers/google), and the other blocks hold
// gateway codes ("nto."/"anthropic."/"openai."-prefixed) that only the gateway
// can resolve. Offering a code the active provider can't resolve doesn't fail
// at selection time — it 404s later, mid-annotation.
function canServeModelsFrom(llmProvider: string, blockName: string): boolean {
  if (llmProvider === "VERTEX_AI") return blockName === VERTEX_AI_PROVIDER_NAME;
  if (llmProvider === "AI_GATEWAY")
    return blockName !== VERTEX_AI_PROVIDER_NAME;
  // OPEN_AI hardcodes its own model and ignores the selected code, and an unset
  // provider means local dev — neither gains anything from filtering.
  return true;
}

export function getAvailableProviders(
  llmProvider: string = getActiveLlmProvider(),
): Provider[] {
  return aiGatewayConfig.providers
    .filter((provider) => canServeModelsFrom(llmProvider, provider.name))
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

export function getDefaultModelCode(
  llmProvider: string = getActiveLlmProvider(),
): string {
  const configuredDefault = findModelByCode(aiGatewayConfig.defaultModel, {
    includeDeprecated: true,
  });
  if (
    configuredDefault &&
    canServeModelsFrom(llmProvider, configuredDefault.provider)
  ) {
    return aiGatewayConfig.defaultModel;
  }

  // The configured default is a gateway code the active provider can't resolve
  // (e.g. "nto.google.gemini-3-flash-preview" under VERTEX_AI) — take that
  // provider's first available model instead.
  const firstServableCode =
    getAvailableProviders(llmProvider)[0]?.models[0]?.code;
  return firstServableCode ?? aiGatewayConfig.defaultModel;
}

// System-initiated LLM calls (alignment checks, prompt suggestions, codebook
// generation) name the model they want rather than taking the user's pick, so
// they need the same swap the dropdown does for user picks.
export function resolveModelCodeForProvider(preferredCode: string): string {
  const llmProvider = getActiveLlmProvider();
  const preferred = findModelByCode(preferredCode, {
    includeDeprecated: true,
  });

  // An unrecognised code isn't ours to reassign — leave it for the provider.
  if (!preferred) return preferredCode;
  if (canServeModelsFrom(llmProvider, preferred.provider)) return preferredCode;

  return getDefaultModelCode(llmProvider);
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
