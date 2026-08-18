import aiGatewayConfigRaw from "~/config/ai_gateway.json";
import type { ModelInfo, PricingTier, Provider } from "./model.types";

interface ModelConfig {
  defaultModel: string;
  taskModels: Record<string, string>;
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

export type TaskModelRole =
  | "promptAlignment"
  | "promptSuggestions"
  | "codebookImport";

export function getDefaultModelCode(): string {
  return aiGatewayConfig.defaultModel;
}

// Model codes are never written in application source — a call that needs a
// specific model names a role here, so the config stays the only enumeration of
// codes and modelAvailability.test.ts can cover every one of them. Resolving
// eagerly against providers turns a config mistake into a loud failure instead
// of usage the billing path cannot price.
export function getTaskModelCode(role: TaskModelRole): string {
  const code = aiGatewayConfig.taskModels?.[role];
  if (!code) {
    throw new Error(`No taskModels entry configured for role: ${role}`);
  }

  const model = findModelByCode(code);
  if (!model) {
    throw new Error(
      `taskModels.${role} is "${code}", which is deprecated or not in providers`,
    );
  }

  if (!model.pricing?.length) {
    throw new Error(
      `taskModels.${role} is "${code}", which has no pricing and would not be billed`,
    );
  }

  return code;
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
  // Deprecated models are hidden from the pickers but still have runs in flight
  // and historical ledger entries — pricing must keep resolving or billing is
  // silently skipped.
  const model = findModelByCode(code, { includeDeprecated: true });
  return model?.pricing ?? [];
}
