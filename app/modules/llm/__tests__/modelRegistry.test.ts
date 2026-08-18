import { describe, expect, it } from "vitest";
import aiGatewayConfig from "~/config/ai_gateway.json";
import type { TaskModelRole } from "../modelRegistry";
import {
  findModelByCode,
  getAvailableModels,
  getAvailableProviders,
  getDefaultModelCode,
  getModelPricing,
  getTaskModelCode,
} from "../modelRegistry";

describe("modelRegistry", () => {
  describe("getDefaultModelCode", () => {
    it("returns a non-empty string", () => {
      const code = getDefaultModelCode();
      expect(code).toBeTruthy();
      expect(typeof code).toBe("string");
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

    it("returns pricing for a deprecated model", () => {
      const deprecated = getAvailableProviders()
        .flatMap((p) => p.models)
        .map((m) => m.code);
      const hidden = findModelByCode("nto.google.gemini-3-flash-preview", {
        includeDeprecated: true,
      });

      expect(hidden).not.toBeNull();
      expect(deprecated).not.toContain(hidden!.code);
      expect(getModelPricing(hidden!.code).length).toBeGreaterThan(0);
    });
  });

  describe("getTaskModelCode", () => {
    const roles = Object.keys(aiGatewayConfig.taskModels) as TaskModelRole[];

    it("the config declares at least one task model role", () => {
      expect(roles.length).toBeGreaterThan(0);
    });

    it.each(roles)("%s resolves to a selectable, priced model", (role) => {
      const code = getTaskModelCode(role);

      expect(
        findModelByCode(code),
        `taskModels.${role} is "${code}", which is deprecated or not in providers`,
      ).not.toBeNull();
      expect(
        getModelPricing(code).length,
        `taskModels.${role} resolves to "${code}", which has no pricing tiers`,
      ).toBeGreaterThan(0);
    });

    it("throws for a role the config does not declare", () => {
      expect(() => getTaskModelCode("notARole" as TaskModelRole)).toThrow(
        /notARole/,
      );
    });
  });

  describe("config validation", () => {
    it("every model has a non-empty pricing array, deprecated included", () => {
      // getAvailableModels() hides deprecated entries, but those keep resolving
      // for pricing on in-flight runs, so they need the same guarantee.
      for (const provider of aiGatewayConfig.providers) {
        for (const model of provider.models) {
          expect(
            model.pricing?.length,
            `Model ${model.code} has no pricing tiers`,
          ).toBeGreaterThan(0);
        }
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
