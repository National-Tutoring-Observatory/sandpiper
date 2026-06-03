import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/teamUsers.route";

describe("teamUsers.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to / when there is no session cookie", async () => {
      const team = await TeamService.create({ name: "test-team" });

      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/"),
          params: { teamId: team._id },
          unstable_pattern: "",
          context: {},
        } as any),
      );
    });

    it("redirects to / when user is not authorized to view team users", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const user = await UserService.create({
        username: "unauthorized-user",
        githubId: 1,
      });

      const cookieHeader = await loginUser(user._id);

      const res = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe("/");
    });

    it("returns team users filtered by team id", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      await UserService.create({
        username: "user2",
        githubId: 3,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      // Create user not in this team
      await UserService.create({
        username: "user3",
        githubId: 4,
      });

      const cookieHeader = await loginUser(admin._id);

      const result = await loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      if (result instanceof Response)
        throw new Error("Expected data, got Response");
      expect(result.users.data).toHaveLength(2);
      expect(result.users.data.map((u: any) => u.username)).toContain("user1");
      expect(result.users.data.map((u: any) => u.username)).toContain("user2");
    });
  });

  describe("action - ADD_USERS_TO_TEAM", () => {
    it("adds multiple users to team", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const user1 = await UserService.create({
        username: "user1",
        githubId: 2,
      });

      const user2 = await UserService.create({
        username: "user2",
        githubId: 3,
      });

      const cookieHeader = await loginUser(admin._id);

      const body = JSON.stringify({
        intent: "ADD_USERS_TO_TEAM",
        payload: {
          users: [
            { userId: user1._id, role: "MEMBER" },
            { userId: user2._id, role: "MEMBER" },
          ],
        },
      });

      await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      const updatedUser1 = await UserService.findById(user1._id);
      const updatedUser2 = await UserService.findById(user2._id);

      expect(
        updatedUser1?.teams.some(
          (t) => t.team === team._id && t.role === "MEMBER",
        ),
      ).toBe(true);
      expect(
        updatedUser2?.teams.some(
          (t) => t.team === team._id && t.role === "MEMBER",
        ),
      ).toBe(true);
    });

    it("returns 400 when role is invalid", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const user1 = await UserService.create({
        username: "user1",
        githubId: 2,
      });

      const cookieHeader = await loginUser(admin._id);

      const body = JSON.stringify({
        intent: "ADD_USERS_TO_TEAM",
        payload: {
          users: [{ userId: user1._id, role: "INVALID_ROLE" }],
        },
      });

      const res = await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect((res as any).init?.status).toBe(400);

      const updatedUser = await UserService.findById(user1._id);
      expect(updatedUser?.teams ?? []).not.toContainEqual(
        expect.objectContaining({ team: team._id }),
      );
    });

    it("throws when user is not authorized", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const unauthorizedUser = await UserService.create({
        username: "unauthorized",
        githubId: 1,
      });

      const user1 = await UserService.create({
        username: "user1",
        githubId: 2,
      });

      const cookieHeader = await loginUser(unauthorizedUser._id);

      const body = JSON.stringify({
        intent: "ADD_USERS_TO_TEAM",
        payload: { userIds: [user1._id] },
      });

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "PUT",
            headers: { cookie: cookieHeader },
            body,
          }),
          params: { teamId: team._id },
          unstable_pattern: "",
          context: {},
        } as any),
      ).rejects.toThrow("You do not have permission to manage team users");
    });
  });

  describe("action - UPDATE_USER_ROLE", () => {
    it("changes a user's role", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const user = await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "MEMBER" }],
      });

      const cookieHeader = await loginUser(admin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER_ROLE",
        payload: { userId: user._id, role: "ADMIN" },
      });

      await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      const updatedUser = await UserService.findById(user._id);
      expect(
        updatedUser?.teams?.find((t: any) => t.team === team._id)?.role,
      ).toBe("ADMIN");
    });

    it("returns 400 when role is invalid", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const target = await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "MEMBER" }],
      });

      const cookieHeader = await loginUser(admin._id);

      const res = await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UPDATE_USER_ROLE",
            payload: { userId: target._id, role: "INVALID_ROLE" },
          }),
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect((res as any).init?.status).toBe(400);
    });

    it("throws when user is not authorized", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const unauthorizedUser = await UserService.create({
        username: "unauthorized",
        githubId: 1,
      });

      const target = await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "MEMBER" }],
      });

      const cookieHeader = await loginUser(unauthorizedUser._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER_ROLE",
        payload: { userId: target._id, role: "ADMIN" },
      });

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "PUT",
            headers: { cookie: cookieHeader },
            body,
          }),
          params: { teamId: team._id },
          unstable_pattern: "",
          context: {},
        } as any),
      ).rejects.toThrow("You do not have permission to manage team users");
    });
  });

  describe("action - REMOVE_USER_FROM_TEAM", () => {
    it("removes user from team atomically", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const user = await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(admin._id);

      const body = JSON.stringify({
        intent: "REMOVE_USER_FROM_TEAM",
        payload: { userId: user._id },
      });

      await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      const updatedUser = await UserService.findById(user._id);
      expect(updatedUser?.teams?.some((t) => t.team === team._id)).toBe(false);
    });

    it("throws when user is not authorized", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const unauthorizedUser = await UserService.create({
        username: "unauthorized",
        githubId: 1,
      });

      const user = await UserService.create({
        username: "user1",
        githubId: 2,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(unauthorizedUser._id);

      const body = JSON.stringify({
        intent: "REMOVE_USER_FROM_TEAM",
        payload: { userId: user._id },
      });

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "PUT",
            headers: { cookie: cookieHeader },
            body,
          }),
          params: { teamId: team._id },
          unstable_pattern: "",
          context: {},
        } as any),
      ).rejects.toThrow("You do not have permission to manage team users");
    });

    it("returns empty object when userId is missing", async () => {
      const team = await TeamService.create({ name: "test-team" });

      const admin = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(admin._id);

      const body = JSON.stringify({
        intent: "REMOVE_USER_FROM_TEAM",
        payload: {},
      });

      const result = await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: { teamId: team._id },
        unstable_pattern: "",
        context: {},
      } as any);

      expect(result).toEqual({});
    });
  });
});
