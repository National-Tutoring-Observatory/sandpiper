import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LLMUsage } from "../llm.types";

const ZERO_USAGE: LLMUsage = {
  inputTokens: 0,
  outputTokens: 0,
  providerCost: 0,
};

const mockUsage: LLMUsage = {
  inputTokens: 100,
  outputTokens: 50,
  providerCost: 0.005,
};

const mockCreateChat = vi.fn();
const mockCostCreate = vi.fn().mockResolvedValue({});

vi.mock("../helpers/getLLM", () => ({
  default: () => ({
    provider: "AI_GATEWAY",
    methods: {
      init: () => ({}),
      createChat: mockCreateChat,
    },
  }),
}));

vi.mock("../helpers/calculateLlmCost", () => ({
  default: ({ inputTokens, outputTokens }: any) =>
    (inputTokens + outputTokens) * 0.00001,
}));

vi.mock("~/modules/billing/services/applyBillingDebit.server", () => ({
  default: (...args: any[]) => mockCostCreate(...args),
}));

vi.mock("mongoose", () => ({
  default: { connection: { readyState: 1 } },
}));

vi.mock("~/modules/billing/teamBilling", () => ({
  TeamBillingService: {
    getBalance: vi.fn().mockResolvedValue(100),
  },
}));

let LLM: typeof import("../llm").default;

beforeEach(async () => {
  vi.resetModules();
  mockCreateChat.mockReset();
  mockCostCreate.mockReset().mockResolvedValue({});
  const mod = await import("../llm");
  LLM = mod.default;
});

const SOURCE = "annotation:per-session" as const;
const MODEL = "test-model";

function makeBillingEventId(testName: string) {
  return `test:${testName}`;
}

describe("LLM", () => {
  describe("getUsage", () => {
    it("returns zero usage before any calls", () => {
      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("zero-usage"),
      });
      expect(llm.getUsage()).toEqual(ZERO_USAGE);
    });

    it("returns accumulated usage after createChat", async () => {
      mockCreateChat.mockResolvedValueOnce({
        content: { result: "ok" },
        usage: mockUsage,
      });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("accumulated-usage"),
      });
      llm.addUserMessage("test", {});
      await llm.createChat();

      expect(llm.getUsage()).toEqual(mockUsage);
    });

    it("returns a copy, not a reference", async () => {
      mockCreateChat.mockResolvedValueOnce({
        content: { result: "ok" },
        usage: mockUsage,
      });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("usage-copy"),
      });
      llm.addUserMessage("test", {});
      await llm.createChat();

      const usage1 = llm.getUsage();
      const usage2 = llm.getUsage();
      expect(usage1).toEqual(usage2);
      expect(usage1).not.toBe(usage2);
    });
  });

  describe("createChat return value", () => {
    it("returns content only (backward compatible)", async () => {
      mockCreateChat.mockResolvedValueOnce({
        content: { annotations: [{ label: "test" }] },
        usage: mockUsage,
      });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("content-only"),
      });
      llm.addUserMessage("test", {});
      const result = await llm.createChat();

      expect(result).toEqual({ annotations: [{ label: "test" }] });
    });
  });

  describe("cost ledger", () => {
    it("writes a cost record after createChat", async () => {
      mockCreateChat.mockResolvedValueOnce({
        content: { result: "ok" },
        usage: mockUsage,
      });

      const llm = new LLM({
        source: "annotation:per-session",
        model: MODEL,
        userId: "user-123",
        sourceId: "session-123",
        billingEventId: "event-123",
        team: "team-456",
      });
      llm.addUserMessage("test", {});
      await llm.createChat();

      expect(mockCostCreate).toHaveBeenCalledOnce();
      const record = mockCostCreate.mock.calls[0][0];
      expect(record.teamId).toBe("team-456");
      expect(record.source).toBe("annotation:per-session");
      expect(record.sourceId).toBe("session-123");
      expect(record.inputTokens).toBe(100);
      expect(record.outputTokens).toBe(50);
      expect(record.rawAmount).toBeGreaterThan(0);
      expect(record.providerCost).toBe(0.005);
      expect(record.idempotencyKey).toBe(
        "llm-cost:event-123:team-456:annotation:per-session:session-123:100:50",
      );
    });

    it("writes one record per orchestrator attempt", async () => {
      const callUsage: LLMUsage = {
        inputTokens: 100,
        outputTokens: 50,
        providerCost: 0.005,
      };
      const scoreUsage: LLMUsage = {
        inputTokens: 30,
        outputTokens: 10,
        providerCost: 0.001,
      };

      mockCreateChat
        .mockResolvedValueOnce({
          content: { result: "bad" },
          usage: callUsage,
        })
        .mockResolvedValueOnce({
          content: { score: 0.2, reasoning: "wrong" },
          usage: scoreUsage,
        })
        .mockResolvedValueOnce({
          content: { result: "good" },
          usage: callUsage,
        })
        .mockResolvedValueOnce({
          content: { score: 1.0, reasoning: "correct" },
          usage: scoreUsage,
        });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        retries: 3,
        billingEventId: makeBillingEventId("orchestrator-attempts"),
        team: "team-1",
      });
      llm.setOrchestratorMessage("Check this", {});
      llm.addUserMessage("test", {});
      await llm.createChat();

      expect(mockCostCreate).toHaveBeenCalledTimes(2);
      const firstRecord = mockCostCreate.mock.calls[0][0];
      expect(firstRecord.inputTokens).toBe(130);
      expect(firstRecord.outputTokens).toBe(60);
      const secondRecord = mockCostCreate.mock.calls[1][0];
      expect(secondRecord.inputTokens).toBe(130);
      expect(secondRecord.outputTokens).toBe(60);
    });

    it("does not throw when ledger write fails", async () => {
      mockCostCreate.mockRejectedValueOnce(new Error("DB down"));
      mockCreateChat.mockResolvedValueOnce({
        content: { result: "ok" },
        usage: mockUsage,
      });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("ledger-write-fails"),
        team: "team-1",
      });
      llm.addUserMessage("test", {});

      await expect(llm.createChat()).resolves.toEqual({ result: "ok" });
    });
  });

  describe("usage accumulation with orchestrator", () => {
    it("accumulates usage from main call and scoring call", async () => {
      const mainUsage: LLMUsage = {
        inputTokens: 200,
        outputTokens: 100,
        providerCost: 0.01,
      };
      const scoreUsage: LLMUsage = {
        inputTokens: 50,
        outputTokens: 20,
        providerCost: 0.002,
      };

      mockCreateChat
        .mockResolvedValueOnce({
          content: { result: "ok" },
          usage: mainUsage,
        })
        .mockResolvedValueOnce({
          content: { score: 1.0, reasoning: "good" },
          usage: scoreUsage,
        });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("orchestrator-usage"),
      });
      llm.setOrchestratorMessage("Check this", {});
      llm.addUserMessage("test", {});
      await llm.createChat();

      expect(llm.getUsage()).toEqual({
        inputTokens: 250,
        outputTokens: 120,
        providerCost: 0.012,
      });
    });

    it("accumulates usage across retries", async () => {
      const callUsage: LLMUsage = {
        inputTokens: 100,
        outputTokens: 50,
        providerCost: 0.005,
      };
      const scoreUsage: LLMUsage = {
        inputTokens: 30,
        outputTokens: 10,
        providerCost: 0.001,
      };

      mockCreateChat
        .mockResolvedValueOnce({
          content: { result: "bad" },
          usage: callUsage,
        })
        .mockResolvedValueOnce({
          content: { score: 0.2, reasoning: "wrong" },
          usage: scoreUsage,
        })
        .mockResolvedValueOnce({
          content: { result: "good" },
          usage: callUsage,
        })
        .mockResolvedValueOnce({
          content: { score: 1.0, reasoning: "correct" },
          usage: scoreUsage,
        });

      const llm = new LLM({
        source: SOURCE,
        model: MODEL,
        userId: "user-123",
        billingEventId: makeBillingEventId("retry-usage"),
        retries: 3,
      });
      llm.setOrchestratorMessage("Check this", {});
      llm.addUserMessage("test", {});
      await llm.createChat();

      expect(llm.getUsage()).toEqual({
        inputTokens: 260,
        outputTokens: 120,
        providerCost: 0.012,
      });
    });
  });
});
