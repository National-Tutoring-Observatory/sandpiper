import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileService } from "~/modules/files/file";
import { ProjectService } from "~/modules/projects/project";
import { TagService } from "~/modules/tags/tag";
import { TeamService } from "~/modules/teams/team";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import createSessionsFromFiles from "../services/createSessionsFromFiles.server";
import { SessionService } from "../session";

vi.mock("~/modules/queues/helpers/taskSequencer", () => ({
  default: class {
    addTask = vi.fn();
    run = vi.fn().mockResolvedValue(undefined);
  },
}));

describe("createSessionsFromFiles", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("only tags sessions created from the given files", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const project = await ProjectService.create({
      name: "project 1",
      team: team._id,
    });
    const tag = await TagService.create({
      name: "tag 1",
      description: "",
      color: "#ff0000",
      team: team._id,
      createdBy: new Types.ObjectId().toString(),
    });

    const leftoverFile = await FileService.create({
      project: project._id,
      name: "leftover.json",
    });
    const uploadedFile = await FileService.create({
      project: project._id,
      name: "uploaded.json",
    });

    await createSessionsFromFiles({
      projectId: project._id,
      shouldCreateSessionModels: true,
      tags: [tag._id],
      fileIds: [uploadedFile._id],
    });

    const [uploadedSession] = await SessionService.find({
      match: { file: uploadedFile._id },
    });
    const [leftoverSession] = await SessionService.find({
      match: { file: leftoverFile._id },
    });

    expect(uploadedSession.tags?.map(String)).toEqual([tag._id]);
    expect(leftoverSession.tags).toEqual([]);
  });
});
