import mongoose from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { UserService } from "../user";
import type { User } from "../users.types";

const generateObjectId = () => new mongoose.Types.ObjectId().toString();

describe("UserService", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("find", () => {
    it("returns all users when no options provided", async () => {
      const user1 = await UserService.create({
        username: "user1",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const user2 = await UserService.create({
        username: "user2",
        role: "USER",
        githubId: 100002,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.find();

      expect(result).toHaveLength(2);
      expect(result.map((u: User) => u._id)).toContain(user1._id);
      expect(result.map((u: User) => u._id)).toContain(user2._id);
    });

    it("filters users by match criteria", async () => {
      await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      await UserService.create({
        username: "user1",
        role: "USER",
        githubId: 100002,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.find({ match: { role: "SUPER_ADMIN" } });

      expect(result).toHaveLength(1);
      expect(result[0].username).toBe("admin");
    });

    it("sorts users by specified field", async () => {
      await UserService.create({
        username: "zebra",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      await UserService.create({
        username: "apple",
        role: "USER",
        githubId: 100002,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.find({ sort: { username: 1 } });

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe("apple");
      expect(result[1].username).toBe("zebra");
    });

    it("paginates results with skip and limit", async () => {
      for (let i = 0; i < 5; i++) {
        await UserService.create({
          username: `user${i}`,
          role: "USER",
          githubId: 100001 + i,
          hasGithubSSO: true,
          isRegistered: true,
        });
      }

      const result = await UserService.find({
        pagination: { skip: 2, limit: 2 },
      });

      expect(result).toHaveLength(2);
    });
  });

  describe("count", () => {
    it("returns the count of matching documents", async () => {
      await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      await UserService.create({
        username: "user1",
        role: "USER",
        githubId: 100002,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const count = await UserService.count({ role: "USER" });

      expect(count).toBe(1);
    });

    it("returns count of all documents when no match provided", async () => {
      await UserService.create({
        username: "user1",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      await UserService.create({
        username: "user2",
        role: "USER",
        githubId: 100002,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const count = await UserService.count();

      expect(count).toBe(2);
    });
  });

  describe("findById", () => {
    it("returns user by id", async () => {
      const user = await UserService.create({
        username: "testuser",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.findById(user._id);

      expect(result).toBeDefined();
      expect(result?._id).toBe(user._id);
      expect(result?.username).toBe("testuser");
    });

    it("returns null when user not found", async () => {
      const result = await UserService.findById(generateObjectId());

      expect(result).toBeNull();
    });

    it("returns null when id is undefined", async () => {
      const result = await UserService.findById(undefined);

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates a new user", async () => {
      const result = await UserService.create({
        username: "newuser",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      expect(result._id).toBeDefined();
      expect(result.username).toBe("newuser");
      expect(result.role).toBe("USER");
    });

    it("rejects an empty email", async () => {
      await expect(
        UserService.create({
          username: "emptyemail",
          email: "",
          role: "USER",
          githubId: 100002,
          hasGithubSSO: true,
          isRegistered: true,
        }),
      ).rejects.toThrow();
    });

    it("rejects a whitespace-only email", async () => {
      await expect(
        UserService.create({
          username: "spaceemail",
          email: "   ",
          role: "USER",
          githubId: 100003,
          hasGithubSSO: true,
          isRegistered: true,
        }),
      ).rejects.toThrow();
    });

    it("creates an invited user without an email", async () => {
      const result = await UserService.create({
        username: "invited",
        role: "USER",
        isRegistered: false,
        inviteId: "invite-123",
      });

      expect(result._id).toBeDefined();
      expect(result.email).toBeUndefined();
    });
  });

  describe("updateById", () => {
    it("updates user by id", async () => {
      const user = await UserService.create({
        username: "oldname",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.updateById(user._id, {
        username: "newname",
      });

      expect(result).toBeDefined();
      expect(result?.username).toBe("newname");

      const retrieved = await UserService.findById(user._id);
      expect(retrieved?.username).toBe("newname");
    });

    it("returns null when user not found", async () => {
      const result = await UserService.updateById(generateObjectId(), {
        username: "newname",
      });

      expect(result).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("deletes user by id", async () => {
      const user = await UserService.create({
        username: "todelete",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
      });

      const result = await UserService.deleteById(user._id);

      expect(result).toBeDefined();
      expect(result?._id).toBe(user._id);

      const retrieved = await UserService.findById(user._id);
      expect(retrieved).toBeNull();
    });

    it("returns null when user not found", async () => {
      const result = await UserService.deleteById(generateObjectId());

      expect(result).toBeNull();
    });
  });

  describe("removeTeam", () => {
    it("removes team from user's teams array", async () => {
      const teamId = generateObjectId();
      const user = await UserService.create({
        username: "teamuser",
        role: "USER",
        githubId: 100001,
        hasGithubSSO: true,
        isRegistered: true,
        teams: [{ team: teamId, role: "ADMIN" }],
      });

      await UserService.removeTeam(user._id, teamId);

      const updated = await UserService.findById(user._id);
      expect(updated?.teams).toHaveLength(0);
    });
  });
});
