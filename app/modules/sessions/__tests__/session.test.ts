import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { ProjectService } from "~/modules/projects/project";
import { TagService } from "~/modules/tags/tag";
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

describe("SessionService.removeTagFromAllSessions", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  const createTag = (teamId: string, name: string) =>
    TagService.create({
      name,
      description: "",
      color: "#ff0000",
      team: teamId,
      createdBy: new Types.ObjectId().toString(),
    });

  it("removes the tag from every session and keeps other tags", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "project 1",
      team: team._id,
    });
    const removedTag = await createTag(team._id, "removed");
    const keptTag = await createTag(team._id, "kept");

    const sessionA = await SessionService.create({
      project: project._id,
      name: "s1",
      tags: [removedTag._id, keptTag._id],
    });
    const sessionB = await SessionService.create({
      project: project._id,
      name: "s2",
      tags: [removedTag._id],
    });

    const modified = await SessionService.removeTagFromAllSessions(
      removedTag._id,
    );

    expect(modified).toBe(2);
    expect((await SessionService.findById(sessionA._id))?.tags).toEqual([
      keptTag._id,
    ]);
    expect((await SessionService.findById(sessionB._id))?.tags).toEqual([]);
  });

  it("leaves sessions without the tag untouched", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "project 1",
      team: team._id,
    });
    const removedTag = await createTag(team._id, "removed");
    const otherTag = await createTag(team._id, "other");

    const other = await SessionService.create({
      project: project._id,
      name: "s1",
      tags: [otherTag._id],
    });

    const modified = await SessionService.removeTagFromAllSessions(
      removedTag._id,
    );

    expect(modified).toBe(0);
    expect((await SessionService.findById(other._id))?.tags).toEqual([
      otherTag._id,
    ]);
  });
});
