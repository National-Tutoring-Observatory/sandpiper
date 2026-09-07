import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { TeamService } from "~/modules/teams/team";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { SessionService } from "../session";

describe("SessionService.updateMany", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("applies updates to every matching session", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "project 1",
      team: team._id,
    });

    const sessionA = await SessionService.create({
      project: project._id,
      hasConverted: false,
      name: "s1",
    });
    const sessionB = await SessionService.create({
      project: project._id,
      hasConverted: false,
      name: "s2",
    });

    const modified = await SessionService.updateMany({
      ids: [sessionA._id, sessionB._id],
      updates: { hasConverted: true },
    });

    expect(modified).toBe(2);
    expect((await SessionService.findById(sessionA._id))?.hasConverted).toBe(
      true,
    );
    expect((await SessionService.findById(sessionB._id))?.hasConverted).toBe(
      true,
    );
  });

  it("leaves sessions outside the id list untouched", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "project 1",
      team: team._id,
    });

    const target = await SessionService.create({
      project: project._id,
      hasConverted: false,
      name: "s1",
    });
    const other = await SessionService.create({
      project: project._id,
      hasConverted: false,
      name: "s2",
    });

    const modified = await SessionService.updateMany({
      ids: [target._id],
      updates: { hasConverted: true },
    });

    expect(modified).toBe(1);
    expect((await SessionService.findById(other._id))?.hasConverted).toBe(
      false,
    );
  });
});
