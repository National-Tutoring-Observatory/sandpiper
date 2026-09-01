import { afterEach, describe, expect, it } from "vitest";
import {
  findModelByCode,
  getAvailableModels,
  getAvailableProviders,
  getDefaultModelCode,
  getModelPricing,
  resolveModelCodeForProvider,
  VERTEX_AI_PROVIDER_NAME,
} from "../modelRegistry";

describe("modelRegistry", () => {
  describe("getDefaultModelCode", () => {
    it("returns a non-empty string", () => {
      const code = getDefaultModelCode();
      expect(code).toBeTruthy();
      expect(typeof code).toBe("string");
    });

    it("returns a Vertex model for the VERTEX_AI provider", () => {
      const code = getDefaultModelCode("VERTEX_AI");
      expect(findModelByCode(code)?.provider).toBe(VERTEX_AI_PROVIDER_NAME);
    });

    it("returns a gateway model for the AI_GATEWAY provider", () => {
      const code = getDefaultModelCode("AI_GATEWAY");
      expect(findModelByCode(code)?.provider).not.toBe(VERTEX_AI_PROVIDER_NAME);
    });
  });

  describe("getAvailableProviders filtered by LLM provider", () => {
    it("offers only Vertex models on VERTEX_AI", () => {
      const providers = getAvailableProviders("VERTEX_AI");
      expect(providers.map((provider) => provider.name)).toEqual([
        VERTEX_AI_PROVIDER_NAME,
      ]);
    });

    it("hides Vertex-only models on AI_GATEWAY", () => {
      const names = getAvailableProviders("AI_GATEWAY").map(
        (provider) => provider.name,
      );
      expect(names.length).toBeGreaterThan(0);
      expect(names).not.toContain(VERTEX_AI_PROVIDER_NAME);
    });
  });

  describe("resolveModelCodeForProvider", () => {
    const originalProvider = process.env.LLM_PROVIDER;

    afterEach(() => {
      if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = originalProvider;
    });

    it("keeps the preferred code on non-Vertex providers", () => {
      process.env.LLM_PROVIDER = "AI_GATEWAY";
      expect(resolveModelCodeForProvider("anthropic.claude-4.6-sonnet")).toBe(
        "anthropic.claude-4.6-sonnet",
      );
    });

    it("swaps a non-Vertex code for a Vertex model on VERTEX_AI", () => {
      process.env.LLM_PROVIDER = "VERTEX_AI";
      const code = resolveModelCodeForProvider("anthropic.claude-4.6-sonnet");
      expect(findModelByCode(code)?.provider).toBe(VERTEX_AI_PROVIDER_NAME);
    });

    it("keeps a code that Vertex already serves", () => {
      process.env.LLM_PROVIDER = "VERTEX_AI";
      const vertexCode =
        getAvailableModels().find(
          (model) => model.provider === VERTEX_AI_PROVIDER_NAME,
        )?.code ?? "";
      expect(vertexCode).toBeTruthy();
      expect(resolveModelCodeForProvider(vertexCode)).toBe(vertexCode);
    });
  });

  describe("getAvailableProviders", () => {
    it("returns providers with models", () => {
      const providers = getAvailableProviders();
      expect(providers.length).toBeGreaterThan(0);
      for (const provider of providers) {
        expect(provider.name).toBeTruthy();
        expect(provider.models.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getAvailableModels", () => {
    it("returns a flat list of models", () => {
      const models = getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      for (const model of models) {
        expect(model.code).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(model.provider).toBeTruthy();
      }
    });
  });

  describe("findModelByCode", () => {
    it("finds a model by code", () => {
      const models = getAvailableModels();
      const first = models[0];
      const found = findModelByCode(first.code);
      expect(found).not.toBeNull();
      expect(found?.code).toBe(first.code);
      expect(found?.name).toBe(first.name);
      expect(found?.provider).toBe(first.provider);
    });

    it("returns null for unknown code", () => {
      expect(findModelByCode("nonexistent.model")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(findModelByCode("")).toBeNull();
    });
  });

  describe("getModelPricing", () => {
    it("returns pricing tiers for a known model", () => {
      const models = getAvailableModels();
      const pricing = getModelPricing(models[0].code);
      expect(pricing.length).toBeGreaterThan(0);
      for (const tier of pricing) {
        expect(tier.inputCostPer1M).toBeGreaterThanOrEqual(0);
        expect(tier.outputCostPer1M).toBeGreaterThanOrEqual(0);
      }
    });

    it("returns empty array for unknown model", () => {
      expect(getModelPricing("nonexistent.model")).toEqual([]);
    });
  });

  describe("config validation", () => {
    it("every model has a non-empty pricing array", () => {
      const models = getAvailableModels();
      for (const model of models) {
        expect(
          model.pricing?.length,
          `Model ${model.code} has no pricing tiers`,
        ).toBeGreaterThan(0);
      }
    });

    it("pricing tiers are sorted ascending by upToInputTokens", () => {
      const providers = getAvailableProviders();
      for (const provider of providers) {
        for (const model of provider.models) {
          const thresholds = model.pricing
            .filter((t) => t.upToInputTokens != null)
            .map((t) => t.upToInputTokens!);
          for (let i = 1; i < thresholds.length; i++) {
            expect(
              thresholds[i],
              `Model ${model.code} has unsorted pricing tiers`,
            ).toBeGreaterThan(thresholds[i - 1]);
          }
        }
      }
    });

    it("last pricing tier has no upToInputTokens (catch-all)", () => {
      const providers = getAvailableProviders();
      for (const provider of providers) {
        for (const model of provider.models) {
          if (model.pricing.length > 1) {
            const lastTier = model.pricing[model.pricing.length - 1];
            expect(
              lastTier.upToInputTokens,
              `Model ${model.code} last tier should be catch-all (no upToInputTokens)`,
            ).toBeUndefined();
          }
        }
      }
    });
  });
});
