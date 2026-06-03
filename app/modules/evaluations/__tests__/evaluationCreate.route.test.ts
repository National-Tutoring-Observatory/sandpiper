import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createTestRun from "../../../../test/helpers/createTestRun";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/evaluationCreate.route";

describe("evaluationCreate.route loader - IDOR protection", () => {
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
      },
    } as any);

    expect(res).toBeInstanceOf(Response);
    expect((res as Response).headers.get("Location")).toBe(
      `/teams/${teamB._id}/projects/${projectB._id}/run-sets`,
    );
  });
});

describe("evaluationCreate.route action - CREATE_EVALUATION authorization", () => {
  let cookieHeader: string;
  let teamId: string;
  let projectId: string;
  let runSetId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const team = await TeamService.create({ name: "Team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "test_user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    cookieHeader = await loginUser(user._id);

    const project = await ProjectService.create({
      name: "Project",
      createdBy: user._id,
      team: team._id,
    });
    projectId = project._id;

    const runSet = await RunSetService.create({
      name: "RunSet",
      project: projectId,
      annotationType: "PER_UTTERANCE",
      runs: [],
    });
    runSetId = runSet._id;
  });

  const makeRequest = (payload: object, cookie: string) =>
    new Request("http://localhost/", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ intent: "CREATE_EVALUATION", payload }),
    });

  it("rejects run IDs that belong to a different project", async () => {
    const otherTeam = await TeamService.create({ name: "Other Team" });
    const otherProject = await ProjectService.create({
      name: "Other Project",
      createdBy: "000000000000000000000001",
      team: otherTeam._id,
    });

    const foreignRun = await createTestRun({
      name: "Foreign Run",
      project: otherProject._id,
      isRunning: false,
      isComplete: true,
    });

    const ownRun = await createTestRun({
      name: "Own Run",
      project: projectId,
      isRunning: false,
      isComplete: true,
    });

    await RunSetService.updateById(runSetId, {
      runs: [ownRun._id, foreignRun._id],
    });

    const res = (await action({
      request: makeRequest(
        {
          name: "Eval",
          baseRun: ownRun._id,
          selectedRuns: [foreignRun._id],
          selectedAnnotationFields: ["field1"],
        },
        cookieHeader,
      ),
      params: { teamId, projectId, runSetId },
    } as any)) as any;

    expect(res.data.errors.runs).toMatch(/could not be found/i);
  });
});
