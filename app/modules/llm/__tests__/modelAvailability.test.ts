import { describe, expect, it } from "vitest";
import aiGatewayConfig from "~/config/ai_gateway.json";
import { getAvailableModels, getDefaultModelCode } from "../modelRegistry";
import gatewayModels from "./gatewayModels.fixture.json";

// Codes still on the gateway's pre-rename naming. Each resolves as a hidden
// alias, so it never appears in the model listing — the canonical id it maps to
// is what has to exist. Renaming these in the config instead would split one
// model into two identities in the ledger, so the indirection lives here.
const LEGACY_ALIASES: Record<string, string> = {
  "nto.google.gemini-2.5-flash-lite": "nto.gemini-2.5-flash-lite",
  "nto.google.gemini-3.1-pro-preview": "nto.gemini-3.1-pro-preview",
  "nto.google.gemini-3.5-flash": "nto.gemini-3.5-flash",
  "anthropic.claude-4.5-haiku": "claude-haiku-4-5",
  "anthropic.claude-4.5-sonnet": "claude-sonnet-4-5",
  "anthropic.claude-4.5-opus": "claude-opus-4-5",
  "anthropic.claude-4.6-sonnet": "claude-sonnet-4-6",
  "anthropic.claude-4.6-opus": "claude-opus-4-6",
  "anthropic.claude-4.7-opus": "claude-opus-4-7",
};

const gatewayIds = new Set<string>(gatewayModels.ids);

function resolveGatewayId(code: string) {
  return LEGACY_ALIASES[code] ?? code;
}

describe("model availability", () => {
  it("every selectable model resolves to a model the gateway serves", () => {
    for (const model of getAvailableModels()) {
      const gatewayId = resolveGatewayId(model.code);

      expect(
        gatewayIds.has(gatewayId),
        `${model.name} (${model.code}) resolves to "${gatewayId}", which the gateway no longer serves`,
      ).toBe(true);
    }
  });

  it("the default model is selectable", () => {
    const codes = getAvailableModels().map((model) => model.code);

    expect(
      codes,
      `defaultModel "${getDefaultModelCode()}" is deprecated or missing, which breaks session uploads`,
    ).toContain(getDefaultModelCode());
  });

  it("every task model is selectable and served by the gateway", () => {
    const codes = new Set(getAvailableModels().map((model) => model.code));

    for (const [role, code] of Object.entries(aiGatewayConfig.taskModels)) {
      expect(
        codes.has(code),
        `taskModels.${role} is "${code}", which is deprecated or missing from the config`,
      ).toBe(true);

      const gatewayId = resolveGatewayId(code);
      expect(
        gatewayIds.has(gatewayId),
        `taskModels.${role} resolves to "${gatewayId}", which the gateway no longer serves`,
      ).toBe(true);
    }
  });

  it("has no alias entries for models the config dropped", () => {
    const codes = new Set(getAvailableModels().map((model) => model.code));

    for (const legacyCode of Object.keys(LEGACY_ALIASES)) {
      expect(
        codes.has(legacyCode),
        `${legacyCode} is no longer a selectable model — drop it from LEGACY_ALIASES`,
      ).toBe(true);
    }
  });
});
