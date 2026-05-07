import each from "lodash/each.js";
import mongoose from "mongoose";
import type { LlmCostSource } from "~/modules/billing/billingAnalytics.types";
import calculateLlmCost from "./helpers/calculateLlmCost";
import getLLM from "./helpers/getLLM";
import type { LLMUsage } from "./llm.types";
import "./providers/aiGateway.js";
import "./providers/openAI.js";

interface Message {
  role: "system" | "assistant" | "user";
  content: string;
}

interface OrchestratorMessage {
  role: "assistant";
  content: string;
}

type Variables = Record<string, string>;

interface LLMOptions {
  source: LlmCostSource;
  model: string;
  sourceId?: string;
  billingEventId: string;
  team?: string;
  userId: string;
  schema?: object;
  retries?: number;
  timeout?: number;
}

const DEFAULT_RETRIES = 3;

class LLM {
  options: LLMOptions & { retries: number };
  messages: Message[];
  orchestratorMessage: OrchestratorMessage | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  methods: any;
  retries: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  llm: any;
  schema: object | undefined;
  private totalUsage: LLMUsage = {
    inputTokens: 0,
    outputTokens: 0,
    providerCost: 0,
  };

  private lastFlushedUsage: LLMUsage = {
    inputTokens: 0,
    outputTokens: 0,
    providerCost: 0,
  };

  constructor(options: LLMOptions) {
    if (!options.billingEventId.trim()) {
      throw new Error("billingEventId is required");
    }

    this.options = { retries: DEFAULT_RETRIES, ...options };
    this.messages = [];
    this.schema = options.schema;
    const llm = getLLM(process.env.LLM_PROVIDER || "");
    this.retries = 0;
    if (llm && llm.methods) {
      this.methods = llm.methods;
      this.llm = llm.methods.init({ timeout: options.timeout });
    } else {
      console.warn(`This LLM does not exist`);
    }
  }

  private accumulateUsage(usage: LLMUsage) {
    this.totalUsage.inputTokens += usage.inputTokens;
    this.totalUsage.outputTokens += usage.outputTokens;
    this.totalUsage.providerCost += usage.providerCost;
  }

  getUsage(): LLMUsage {
    return { ...this.totalUsage };
  }

  private async writeCostRecord() {
    if (mongoose.connection.readyState !== 1) return;

    const delta: LLMUsage = {
      inputTokens:
        this.totalUsage.inputTokens - this.lastFlushedUsage.inputTokens,
      outputTokens:
        this.totalUsage.outputTokens - this.lastFlushedUsage.outputTokens,
      providerCost:
        this.totalUsage.providerCost - this.lastFlushedUsage.providerCost,
    };

    if (delta.inputTokens === 0 && delta.outputTokens === 0) return;
    if (!this.options.team) return;

    try {
      const applyBillingDebit = (
        await import("~/modules/billing/services/applyBillingDebit.server")
      ).default;
      const rawAmount = calculateLlmCost({
        modelCode: this.options.model,
        inputTokens: delta.inputTokens,
        outputTokens: delta.outputTokens,
      });
      await applyBillingDebit({
        teamId: this.options.team,
        userId: this.options.userId,
        model: this.options.model,
        source: this.options.source,
        sourceId: this.options.sourceId,
        inputTokens: delta.inputTokens,
        outputTokens: delta.outputTokens,
        rawAmount,
        providerCost: delta.providerCost,
        idempotencyKey: [
          "llm-cost",
          this.options.billingEventId,
          this.options.team,
          this.options.source,
          this.options.sourceId ?? "none",
          this.totalUsage.inputTokens,
          this.totalUsage.outputTokens,
        ].join(":"),
      });
      this.lastFlushedUsage = { ...this.totalUsage };
    } catch (error) {
      console.warn("Failed to write LLM cost record:", error);
    }
  }

  private async checkBalance() {
    if (!this.options.team) return;
    if (mongoose.connection.readyState !== 1) return;

    const { TeamBillingService } =
      await import("~/modules/billing/teamBilling");
    const balance = await TeamBillingService.getBalance(this.options.team);

    if (balance <= 0) {
      const { insufficientBalanceCounter } =
        await import("~/modules/billing/helpers/billingMetrics");
      insufficientBalanceCounter.add(1, { team: this.options.team });

      const { InsufficientCreditsError } =
        await import("~/modules/billing/errors/insufficientCreditsError");
      throw new InsufficientCreditsError(this.options.team);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createChat = async (): Promise<any> => {
    await this.checkBalance();

    if (this.orchestratorMessage) {
      const result = await this.methods.createChat(this);
      this.accumulateUsage(result.usage);

      const scoreResult = await this.methods.createChat({
        llm: this.llm,
        options: { ...this.options },
        messages: [
          this.orchestratorMessage,
          {
            role: "assistant",
            content: `
          # Where score is 0 when the output is not acceptable
          # Where score is 1 when the output is acceptable and conforms.
          # Where reasoning is your reasoning as to why you scored it the way you did and a potential fix if we were to run it again.
          # You must return the following JSON: {"score": 0, "reasoning": ""}
          Output: ${JSON.stringify(result.content)}
          `,
          },
        ],
      });
      this.accumulateUsage(scoreResult.usage);

      if (scoreResult.content.score > 0.8) {
        await this.writeCostRecord();
        return result.content;
      } else {
        console.warn(
          `Score: ${scoreResult.content.score}, Reasoning: ${scoreResult.content.reasoning}`,
        );
        await this.writeCostRecord();
        if (this.retries < this.options.retries) {
          this.retries++;
          console.warn(
            `Retrying ${this.retries} out of ${this.options.retries}`,
          );
          this.addUserMessage(
            `This is not correct. Please try again with the following reason why this is not correct. Reasoning: ${scoreResult.content.reasoning}`,
            {},
          );
          return await this.createChat();
        } else {
          throw { message: "Too many retries" };
        }
      }
    } else {
      const result = await this.methods.createChat(this);
      this.accumulateUsage(result.usage);
      await this.writeCostRecord();
      return result.content;
    }
  };

  replaceMessageWithVariables = (
    message: string,
    variables: Record<string, string> = {},
  ): string => {
    each(variables, (variableValue, variableKey) => {
      message = message.replaceAll(`{{${variableKey}}}`, variableValue);
    });
    return message;
  };

  setOrchestratorMessage = (message: string, variables: Variables): void => {
    message = this.replaceMessageWithVariables(message, variables);

    this.orchestratorMessage = {
      role: "assistant",
      content: message.trim(),
    } as OrchestratorMessage;
  };

  addSystemMessage = (message: string, variables: Variables) => {
    message = this.replaceMessageWithVariables(message, variables);

    this.messages.push({
      role: "system",
      content: message.trim(),
    });
  };

  addAssistantMessage = (message: string, variables: Variables) => {
    message = this.replaceMessageWithVariables(message, variables);

    this.messages.push({
      role: "assistant",
      content: message.trim(),
    });
  };

  addUserMessage = (message: string, variables: Variables) => {
    message = this.replaceMessageWithVariables(message, variables);

    this.messages.push({
      role: "user",
      content: message.trim(),
    });
  };

  getLastMessage = () => {
    return this.messages[this.messages.length - 1];
  };

  getMessages = () => {
    return this.messages;
  };

  getMessagesAsString = () => {
    let string = "";
    for (const message of this.messages) {
      string += message.content + "\n";
    }
    return string;
  };
}

export default LLM;
