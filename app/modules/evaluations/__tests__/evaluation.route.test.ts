import { beforeEach, describe, expect, it } from "vitest";
import { EvaluationService } from "~/modules/evaluations/evaluation";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/evaluation.route";

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
