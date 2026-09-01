import { beforeEach, describe, expect, it } from "vitest";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import type { Project } from "~/modules/projects/projects.types";
import { PromptService } from "~/modules/prompts/prompt";
import type { Prompt } from "~/modules/prompts/prompts.types";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { calculateEstimate } from "~/modules/runSets/helpers/calculateEstimate";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import { TeamService } from "~/modules/teams/team";
import type { Team } from "~/modules/teams/teams.types";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { BillingPlanService } from "../billingPlan";
import { TeamBillingService } from "../teamBilling";

const testModel = getAvailableProviders()[0].models[0].code;

describe("TeamBillingService.estimateCost", () => {
  let team: Team;
  let user: User;
  let project: Project;
  let session: Session;
  let prompt: Prompt;

  beforeEach(async () => {
    await clearDocumentDB();

    team = await TeamService.create({ name: "Test Team" });
    user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    project = await ProjectService.create({
      name: "Test Project",
      createdBy: user._id,
      team: team._id,
    });
    session = await SessionService.create({
      name: "Test Session",
      project: project._id,
      inputTokens: 1000,
    });
    prompt = await PromptService.create({
      name: "Test Prompt",
      annotationType: "PER_UTTERANCE",
    });
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      userPrompt: "Test prompt content",
      annotationSchema: [],
    });
  });

  const definition = () => ({
    key: "test",
    modelCode: testModel,
    prompt: { promptId: prompt._id, promptName: "Test Prompt", version: 1 },
  });

  it("returns estimatedCost and estimatedTimeSeconds", async () => {
    await BillingPlanService.create({
      name: "Default",
      markupRate: 1,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);

    const result = await TeamBillingService.estimateCost({
      teamId: team._id,
      projectId: project._id,
      sessionIds: [session._id],
      definitions: [definition()],
      shouldRunVerification: false,
    });

    expect(result).toHaveProperty("estimatedCost");
    expect(result).toHaveProperty("estimatedTimeSeconds");
    expect(result.estimatedCost).toBeGreaterThan(0);
    expect(result.estimatedTimeSeconds).toBeGreaterThan(0);
  });

  it("applies the team billing plan markup rate", async () => {
    const markupRate = 1.5;
    await BillingPlanService.create({
      name: "Standard",
      markupRate,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);

    const result = await TeamBillingService.estimateCost({
      teamId: team._id,
      projectId: project._id,
      sessionIds: [session._id],
      definitions: [definition()],
      shouldRunVerification: false,
    });

    const promptVersion = await PromptVersionService.findOne({
      prompt: prompt._id,
      version: 1,
    });

    const rawEstimate = calculateEstimate(
      [
        {
          modelCode: testModel,
          prompt: { inputTokens: promptVersion?.inputTokens },
        },
      ],
      [{ inputTokens: session.inputTokens }],
      { shouldRunVerification: false },
    );

    expect(result.estimatedCost).toBeCloseTo(
      rawEstimate.estimatedCost * markupRate,
      5,
    );
  });

  it("applies a different markup rate correctly", async () => {
    const markupRate = 2.0;
    await BillingPlanService.create({
      name: "Premium",
      markupRate,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);

    const result = await TeamBillingService.estimateCost({
      teamId: team._id,
      projectId: project._id,
      sessionIds: [session._id],
      definitions: [definition()],
      shouldRunVerification: false,
    });

    const promptVersion = await PromptVersionService.findOne({
      prompt: prompt._id,
      version: 1,
    });

    const rawEstimate = calculateEstimate(
      [
        {
          modelCode: testModel,
          prompt: { inputTokens: promptVersion?.inputTokens },
        },
      ],
      [{ inputTokens: session.inputTokens }],
      { shouldRunVerification: false },
    );

    expect(result.estimatedCost).toBeCloseTo(
      rawEstimate.estimatedCost * markupRate,
      5,
    );
  });

  it("throws when team has no billing plan", async () => {
    await expect(
      TeamBillingService.estimateCost({
        teamId: team._id,
        projectId: project._id,
        sessionIds: [session._id],
        definitions: [definition()],
        shouldRunVerification: false,
      }),
    ).rejects.toThrow("No billing plan found");
  });

  it("estimates without a plan or markup on Vertex AI deployments", async () => {
    const originalProvider = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "VERTEX_AI";

    try {
      const result = await TeamBillingService.estimateCost({
        teamId: team._id,
        projectId: project._id,
        sessionIds: [session._id],
        definitions: [definition()],
        shouldRunVerification: false,
      });

      const promptVersion = await PromptVersionService.findOne({
        prompt: prompt._id,
        version: 1,
      });

      const rawEstimate = calculateEstimate(
        [
          {
            modelCode: testModel,
            prompt: { inputTokens: promptVersion?.inputTokens },
          },
        ],
        [{ inputTokens: session.inputTokens }],
        { shouldRunVerification: false },
      );

      expect(result.estimatedCost).toBeCloseTo(rawEstimate.estimatedCost, 5);
    } finally {
      if (originalProvider === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = originalProvider;
    }
  });

  it("only includes sessions that belong to the project", async () => {
    const otherProject = await ProjectService.create({
      name: "Other Project",
      createdBy: user._id,
      team: team._id,
    });
    const otherSession = await SessionService.create({
      name: "Other Session",
      project: otherProject._id,
      inputTokens: 999999,
    });

    await BillingPlanService.create({
      name: "Default",
      markupRate: 1,
      isDefault: true,
    });
    await TeamBillingService.setupTeamBilling(team._id);

    const withBoth = await TeamBillingService.estimateCost({
      teamId: team._id,
      projectId: project._id,
      sessionIds: [session._id, otherSession._id],
      definitions: [definition()],
      shouldRunVerification: false,
    });

    const withOwn = await TeamBillingService.estimateCost({
      teamId: team._id,
      projectId: project._id,
      sessionIds: [session._id],
      definitions: [definition()],
      shouldRunVerification: false,
    });

    expect(withBoth.estimatedCost).toBe(withOwn.estimatedCost);
  });
});
