import { beforeEach, describe, expect, it } from "vitest";
import { AuditService } from "~/modules/audits/audit";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/adminUsers.route";
import { UserService } from "../user";

describe("adminUsers.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to / when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/userManagement"),
          params: {},
        } as any),
      );
    });

    it("redirects to / when user is not a super admin", async () => {
      const regularUser = await UserService.create({
        username: "regular-user",
        role: "USER",
        githubId: 1,
      });

      const cookieHeader = await loginUser(regularUser._id);

      const res = await loader({
        request: new Request("http://localhost/userManagement", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any);

      expect(res).toBeInstanceOf(Response);
      expect((res as Response).headers.get("Location")).toBe("/");
    });

    it("loads all users and audit trail for super admin", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      await UserService.create({
        username: "user1",
        role: "USER",
        githubId: 2,
      });

      await UserService.create({
        username: "user2",
        role: "USER",
        githubId: 3,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const result = await loader({
        request: new Request("http://localhost/userManagement", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
      } as any);

      if (result instanceof Response)
        throw new Error("Expected data, got Response");

      expect(result.users.data).toHaveLength(3);
      expect(result.users.data.map((u: any) => u.username)).toContain(
        "super-admin",
      );
      expect(result.users.data.map((u: any) => u.username)).toContain("user1");
      expect(result.users.data.map((u: any) => u.username)).toContain("user2");
      expect(result.users.totalPages).toBe(1);
      expect(result.users.count).toBe(3);
      expect(result.audits.data).toBeInstanceOf(Array);
      expect(result.audits.totalPages).toBeGreaterThanOrEqual(0);
    });
  });

  describe("action - ASSIGN_SUPER_ADMIN", () => {
    it("returns error when user is not a super admin", async () => {
      const regularUser = await UserService.create({
        username: "regular-user",
        role: "USER",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(regularUser._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: { targetUserId: targetUser._id, reason: "Test promotion" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response.errors?.general).toBe("Access denied");
    });

    it("returns error when target user is not found", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: { targetUserId: "nonexistent-id", reason: "Test promotion" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("User not found");
    });

    it("returns error when trying to self-promote", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: { targetUserId: superAdmin._id, reason: "Self promotion" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("Cannot perform this action");
    });

    it("returns error when target user is already a super admin", async () => {
      const superAdmin1 = await UserService.create({
        username: "super-admin-1",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const superAdmin2 = await UserService.create({
        username: "super-admin-2",
        role: "SUPER_ADMIN",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin1._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: { targetUserId: superAdmin2._id, reason: "Already admin" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("Cannot perform this action");
    });

    it("returns error when reason is missing", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: { targetUserId: targetUser._id, reason: "" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.reason).toBe("Reason is required");
    });

    it("promotes user to super admin and creates audit record", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: {
          targetUserId: targetUser._id,
          reason: "Trusted deployment manager",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.success).toBe(true);
      expect(response?.intent).toBe("ASSIGN_SUPER_ADMIN");

      // Verify user role was updated
      const updatedUser = await UserService.findById(targetUser._id);
      expect(updatedUser?.role).toBe("SUPER_ADMIN");

      // Verify audit record was created
      const audits = await AuditService.find({
        match: {
          action: "ADD_SUPERADMIN",
          "context.target": targetUser._id,
        },
      });

      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit.performedBy?.toString()).toBe(superAdmin._id.toString());
      expect(audit.context?.targetUsername).toBe(targetUser.username);
      expect(audit.context?.reason).toBe("Trusted deployment manager");
    });

    it("trims whitespace from reason", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "ASSIGN_SUPER_ADMIN",
        payload: {
          targetUserId: targetUser._id,
          reason: "  spaced reason  ",
        },
      });

      await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const audits = await AuditService.find({
        match: {
          action: "ADD_SUPERADMIN",
          "context.target": targetUser._id,
        },
      });

      expect(audits[0].context?.reason).toBe("spaced reason");
    });
  });

  describe("action - REVOKE_SUPER_ADMIN", () => {
    it("returns error when user is not a super admin", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const regularUser = await UserService.create({
        username: "regular-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "REVOKE_SUPER_ADMIN",
        payload: { targetUserId: regularUser._id, reason: "Test revocation" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("Cannot perform this action");
    });

    it("returns error when target user is not found", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "REVOKE_SUPER_ADMIN",
        payload: { targetUserId: "nonexistent-id", reason: "Test revocation" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("User not found");
    });

    it("returns error when reason is missing", async () => {
      const superAdmin1 = await UserService.create({
        username: "super-admin-1",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const superAdmin2 = await UserService.create({
        username: "super-admin-2",
        role: "SUPER_ADMIN",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin1._id);

      const body = JSON.stringify({
        intent: "REVOKE_SUPER_ADMIN",
        payload: { targetUserId: superAdmin2._id, reason: "" },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.reason).toBe("Reason is required");
    });

    it("revokes super admin status and creates audit record", async () => {
      const superAdmin1 = await UserService.create({
        username: "super-admin-1",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const superAdmin2 = await UserService.create({
        username: "super-admin-2",
        role: "SUPER_ADMIN",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin1._id);

      const body = JSON.stringify({
        intent: "REVOKE_SUPER_ADMIN",
        payload: {
          targetUserId: superAdmin2._id,
          reason: "Unauthorized activity detected",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.success).toBe(true);
      expect(response?.intent).toBe("REVOKE_SUPER_ADMIN");

      // Verify user role was updated
      const updatedUser = await UserService.findById(superAdmin2._id);
      expect(updatedUser?.role).toBe("USER");

      // Verify audit record was created
      const audits = await AuditService.find({
        match: {
          action: "REMOVE_SUPERADMIN",
          "context.target": superAdmin2._id,
        },
      });

      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit.performedBy?.toString()).toBe(superAdmin1._id.toString());
      expect(audit.context?.targetUsername).toBe(superAdmin2.username);
      expect(audit.context?.reason).toBe("Unauthorized activity detected");
    });
  });

  describe("action - UPDATE_USER", () => {
    it("returns error when user is not a super admin", async () => {
      const regularUser = await UserService.create({
        username: "regular-user",
        role: "USER",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(regularUser._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: targetUser._id,
          name: "New Name",
          email: "new@example.com",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response.errors?.general).toBe("Access denied");
    });

    it("returns error when target user is not found", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: "nonexistent-id",
          name: "New Name",
          email: "new@example.com",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.general).toBe("User not found");
    });

    it("returns error when email is already in use", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
        email: "admin@example.com",
      });

      await UserService.create({
        username: "existing-user",
        role: "USER",
        githubId: 2,
        email: "taken@example.com",
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 3,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: targetUser._id,
          email: "taken@example.com",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.email).toBe("Email is already in use");
    });

    it("returns error when email is empty", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
        email: "target@example.com",
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: targetUser._id,
          name: "Updated User",
          email: "   ",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.errors?.email).toBe("Email is required");

      const unchanged = await UserService.findById(targetUser._id);
      expect(unchanged?.email).toBe("target@example.com");
    });

    it("successfully updates user name and email", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: targetUser._id,
          name: "Updated User",
          email: "updated@example.com",
        },
      });

      const result = await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const response = (result as any).data;
      expect(response?.success).toBe(true);
      expect(response?.intent).toBe("UPDATE_USER");

      const updatedUser = await UserService.findById(targetUser._id);
      expect(updatedUser?.username).toBe("target-user");
      expect(updatedUser?.name).toBe("Updated User");
      expect(updatedUser?.email).toBe("updated@example.com");
    });

    it("trims whitespace from name and email", async () => {
      const superAdmin = await UserService.create({
        username: "super-admin",
        role: "SUPER_ADMIN",
        githubId: 1,
      });

      const targetUser = await UserService.create({
        username: "target-user",
        role: "USER",
        githubId: 2,
      });

      const cookieHeader = await loginUser(superAdmin._id);

      const body = JSON.stringify({
        intent: "UPDATE_USER",
        payload: {
          targetUserId: targetUser._id,
          name: "  Trimmed Name  ",
          email: "  trimmed@example.com  ",
        },
      });

      await action({
        request: new Request("http://localhost/userManagement", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body,
        }),
        params: {},
      } as any);

      const updatedUser = await UserService.findById(targetUser._id);
      expect(updatedUser?.name).toBe("Trimmed Name");
      expect(updatedUser?.email).toBe("trimmed@example.com");
    });
  });
});
