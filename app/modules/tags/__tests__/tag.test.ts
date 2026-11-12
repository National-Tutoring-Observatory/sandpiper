import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { TagService } from "../tag";

const createTag = (teamId: string, name: string, color = "#ff0000") =>
  TagService.create({
    name,
    description: `${name} description`,
    color,
    team: teamId,
    createdBy: new Types.ObjectId().toString(),
  });

describe("TagService", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("create", () => {
    it("stores the given fields and sets createdAt", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const createdBy = new Types.ObjectId().toString();

      const tag = await TagService.create({
        name: "Math",
        description: "Math sessions",
        color: "#00ff00",
        team: team._id,
        createdBy,
      });

      expect(tag._id).toBeDefined();
      expect(tag.name).toBe("Math");
      expect(tag.description).toBe("Math sessions");
      expect(tag.color).toBe("#00ff00");
      expect(tag.team).toBe(team._id);
      expect(tag.createdBy).toBe(createdBy);
      expect(tag.createdAt).toBeDefined();
    });
  });

  describe("find", () => {
    it("returns only tags matching the filter", async () => {
      const teamA = await TeamService.create({ name: "team A" });
      const teamB = await TeamService.create({ name: "team B" });
      await createTag(teamA._id, "a1");
      await createTag(teamA._id, "a2");
      await createTag(teamB._id, "b1");

      const tags = await TagService.find({ match: { team: teamA._id } });

      expect(tags.map((t) => t.name).sort()).toEqual(["a1", "a2"]);
    });

    it("sorts and paginates results", async () => {
      const team = await TeamService.create({ name: "team 1" });
      await createTag(team._id, "c");
      await createTag(team._id, "a");
      await createTag(team._id, "b");

      const tags = await TagService.find({
        match: { team: team._id },
        sort: { name: 1 },
        pagination: { skip: 1, limit: 1 },
      });

      expect(tags.map((t) => t.name)).toEqual(["b"]);
    });
  });

  describe("count", () => {
    it("counts tags matching the filter", async () => {
      const teamA = await TeamService.create({ name: "team A" });
      const teamB = await TeamService.create({ name: "team B" });
      const a1 = await createTag(teamA._id, "a1");
      await createTag(teamA._id, "a2");
      await createTag(teamB._id, "b1");

      expect(await TagService.count({ team: teamA._id })).toBe(2);
      expect(
        await TagService.count({ _id: { $in: [a1._id] }, team: teamB._id }),
      ).toBe(0);
    });
  });

  describe("paginate", () => {
    it("returns the requested page with count and totalPages", async () => {
      const team = await TeamService.create({ name: "team 1" });
      for (const name of ["a", "b", "c", "d", "e"]) {
        await createTag(team._id, name);
      }

      const result = await TagService.paginate({
        match: { team: team._id },
        sort: { name: 1 },
        page: 2,
        pageSize: 2,
      });

      expect(result.data.map((t) => t.name)).toEqual(["c", "d"]);
      expect(result.count).toBe(5);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("findById", () => {
    it("returns the tag when it exists", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const tag = await createTag(team._id, "a");

      const found = await TagService.findById(tag._id);

      expect(found?._id).toBe(tag._id);
    });

    it("returns null for an undefined id", async () => {
      expect(await TagService.findById(undefined)).toBeNull();
    });

    it("returns null for an unknown id", async () => {
      const found = await TagService.findById(new Types.ObjectId().toString());

      expect(found).toBeNull();
    });
  });

  describe("findOne", () => {
    it("returns the tag when id and team match", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const tag = await createTag(team._id, "a");

      const found = await TagService.findOne({ _id: tag._id, team: team._id });

      expect(found?._id).toBe(tag._id);
    });

    it("returns null when the tag belongs to another team", async () => {
      const teamA = await TeamService.create({ name: "team A" });
      const teamB = await TeamService.create({ name: "team B" });
      const tag = await createTag(teamA._id, "a");

      const found = await TagService.findOne({ _id: tag._id, team: teamB._id });

      expect(found).toBeNull();
    });
  });

  describe("updateById", () => {
    it("updates the tag and returns the new version", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const tag = await createTag(team._id, "old");

      const updated = await TagService.updateById(tag._id, {
        name: "new",
        color: "#0000ff",
      });

      expect(updated?.name).toBe("new");
      expect(updated?.color).toBe("#0000ff");
      expect(updated?.description).toBe("old description");
      expect((await TagService.findById(tag._id))?.name).toBe("new");
    });

    it("returns null for an unknown id", async () => {
      const updated = await TagService.updateById(
        new Types.ObjectId().toString(),
        { name: "new" },
      );

      expect(updated).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("deletes the tag and returns it", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const tag = await createTag(team._id, "a");
      const other = await createTag(team._id, "b");

      const deleted = await TagService.deleteById(tag._id);

      expect(deleted?._id).toBe(tag._id);
      expect(await TagService.findById(tag._id)).toBeNull();
      expect(await TagService.findById(other._id)).not.toBeNull();
    });

    it("returns null for an unknown id", async () => {
      const deleted = await TagService.deleteById(
        new Types.ObjectId().toString(),
      );

      expect(deleted).toBeNull();
    });
  });
});
