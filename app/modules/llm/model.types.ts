export interface PricingTier {
  upToInputTokens?: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export interface ModelInfo {
  code: string;
  name: string;
  provider: string;
  pricing?: PricingTier[];
  deprecated?: boolean;
}

export interface Provider {
  name: string;
  models: Array<{
    code: string;
    name: string;
    pricing: PricingTier[];
  }>;
}

export type Providers = "OpenAI" | "Google" | "Anthropic";
