import { beforeEach, describe, expect, it } from "vitest";
import { EvaluationService } from "~/modules/evaluations/evaluation";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { RunSetService } from "~/modules/runSets/runSet";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/evaluation.route";

describe("evaluation.route loader - IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to run-sets when runSet belongs to a different project", async () => {
    const ownerUser = await UserService.create({
      username: "owner",
      teams: [],
    });
    const teamA = await TeamService.create({ name: "Team A" });
    await UserService.updateById(ownerUser._id, {
      teams: [{ team: teamA._id, role: "ADMIN" }],
    });
    const projectA = await ProjectService.create({
      name: "Project A",
      createdBy: ownerUser._id,
      team: teamA._id,
    });
    const victimRunSet = await RunSetService.create({
      name: "Victim Run Set",
      project: projectA._id,
      annotationType: "PER_UTTERANCE",
      runs: [],
    });
    const victimEvaluation = await EvaluationService.create({
      name: "Victim Eval",
      project: projectA._id,
      runSet: victimRunSet._id,
      runs: [],
    });

    const attacker = await UserService.create({
      username: "attacker",
      teams: [],
    });
    const teamB = await TeamService.create({ name: "Team B" });
    await UserService.updateById(attacker._id, {
      teams: [{ team: teamB._id, role: "ADMIN" }],
    });
    const projectB = await ProjectService.create({
      name: "Project B",
      createdBy: attacker._id,
      team: teamB._id,
    });

    const attackerCookie = await loginUser(attacker._id);
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: attackerCookie },
      }),
      params: {
        teamId: teamB._id,
        projectId: projectB._id,
        runSetId: victimRunSet._id,
        evaluationId: victimEvaluation._id,
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${teamB._id}/projects/${projectB._id}/run-sets`,
    );
  });

  it("redirects to evaluations list when evaluation belongs to a different runSet", async () => {
    const user = await UserService.create({ username: "user", teams: [] });
    const team = await TeamService.create({ name: "Team" });
    await UserService.updateById(user._id, {
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Project",
      createdBy: user._id,
      team: team._id,
    });

    const ownRunSet = await RunSetService.create({
      name: "Own Run Set",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      runs: [],
    });
    const otherRunSet = await RunSetService.create({
      name: "Other Run Set",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      runs: [],
    });
    const evaluationInOtherRunSet = await EvaluationService.create({
      name: "Other Eval",
      project: project._id,
      runSet: otherRunSet._id,
      runs: [],
    });

    const cookieHeader = await loginUser(user._id);
    const res = await loader({
      request: new Request("http://localhost/", {
        headers: { cookie: cookieHeader },
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: ownRunSet._id,
        evaluationId: evaluationInOtherRunSet._id,
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${team._id}/projects/${project._id}/run-sets/${ownRunSet._id}/evaluations`,
    );
  });
});

describe("evaluation.route action - START_ADJUDICATION IDOR protection", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  async function setupSingleTeamFixture() {
    const team = await TeamService.create({ name: "Team" });
    const user = await UserService.create({
      username: "user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const project = await ProjectService.create({
      name: "Project",
      createdBy: user._id,
      team: team._id,
    });
    const run1 = await createTestRun({ name: "Run 1", project: project._id });
    const run2 = await createTestRun({ name: "Run 2", project: project._id });
    const runSet = await RunSetService.create({
      name: "RunSet",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      runs: [run1._id, run2._id],
    });
    const evaluation = await EvaluationService.create({
      name: "Eval",
      project: project._id,
      runSet: runSet._id,
      runs: [run1._id, run2._id],
    });
    const cookieHeader = await loginUser(user._id);
    return {
      team,
      user,
      project,
      run1,
      run2,
      runSet,
      evaluation,
      cookieHeader,
    };
  }

  it("rejects when promptId belongs to a different team", async () => {
    const {
      team,
      project,
      runSet,
      evaluation,
      run1,
      run2,
      user,
      cookieHeader,
    } = await setupSingleTeamFixture();
    const teamB = await TeamService.create({ name: "Team B" });
    await UserService.updateById(user._id, {
      teams: [
        { team: team._id, role: "ADMIN" },
        { team: teamB._id, role: "ADMIN" },
      ],
    });
    const foreignPrompt = await PromptService.create({
      name: "Foreign",
      annotationType: "PER_UTTERANCE",
      team: teamB._id,
    });

    const res = (await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "START_ADJUDICATION",
          payload: {
            selectedRuns: [run1._id, run2._id],
            modelCode: "openai.gpt-5-mini",
            promptId: foreignPrompt._id,
            promptVersion: 1,
          },
        }),
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
        evaluationId: evaluation._id,
      },
    } as any)) as any;

    expect(res.init?.status).toBe(404);
    expect(res.data.errors.prompt).toBeDefined();
  });

  it("rejects when evaluation belongs to a different runSet", async () => {
    const { team, project, runSet, run1, run2, cookieHeader } =
      await setupSingleTeamFixture();
    const otherRunSet = await RunSetService.create({
      name: "Other RunSet",
      project: project._id,
      annotationType: "PER_UTTERANCE",
      runs: [],
    });
    const foreignEval = await EvaluationService.create({
      name: "Foreign Eval",
      project: project._id,
      runSet: otherRunSet._id,
      runs: [],
    });
    const ownPrompt = await PromptService.create({
      name: "Own",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const res = (await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "START_ADJUDICATION",
          payload: {
            selectedRuns: [run1._id, run2._id],
            modelCode: "openai.gpt-5-mini",
            promptId: ownPrompt._id,
            promptVersion: 1,
          },
        }),
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
        evaluationId: foreignEval._id,
      },
    } as any)) as any;

    expect(res.init?.status).toBe(404);
    expect(res.data.errors.evaluation).toBeDefined();
  });

  it("rejects when selectedRuns include a run outside the runSet", async () => {
    const { team, project, runSet, evaluation, run1, cookieHeader } =
      await setupSingleTeamFixture();
    const foreignRun = await createTestRun({
      name: "Foreign Run",
      project: project._id,
    });
    const ownPrompt = await PromptService.create({
      name: "Own",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const res = (await action({
      request: new Request("http://localhost/", {
        method: "POST",
        headers: { cookie: cookieHeader, "content-type": "application/json" },
        body: JSON.stringify({
          intent: "START_ADJUDICATION",
          payload: {
            selectedRuns: [run1._id, foreignRun._id],
            modelCode: "openai.gpt-5-mini",
            promptId: ownPrompt._id,
            promptVersion: 1,
          },
        }),
      }),
      params: {
        teamId: team._id,
        projectId: project._id,
        runSetId: runSet._id,
        evaluationId: evaluation._id,
      },
    } as any)) as any;

    expect(res.init?.status).toBe(400);
    expect(res.data.errors.runs).toBeDefined();
  });
});
