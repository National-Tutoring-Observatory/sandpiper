import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { CodebookService } from "../codebook";
import { CodebookVersionService } from "../codebookVersion";
import { action } from "../containers/codebook.route";

describe("codebook.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("CREATE_CODEBOOK_VERSION", () => {
    it("creates a new codebook version when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const codebook = await CodebookService.create({
        name: "Test Codebook",
        description: "",
        team: team._id,
        productionVersion: 1,
        createdBy: user._id,
      });

      await CodebookVersionService.create({
        name: "Version 1",
        codebook: codebook._id,
        version: 1,

        categories: [] as any,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_CODEBOOK_VERSION",
            entityId: codebook._id,
            payload: { version: 1 },
          }),
        }),
        params: { teamId: team._id, codebookId: codebook._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("CREATE_CODEBOOK_VERSION");
      expect(response.data?.data?.codebook).toBe(codebook._id);
      expect(response.data?.data?.version).toBe(2);
    });

    it("throws when codebook does not exist", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);
      const fakeId = new Types.ObjectId().toString();

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "POST",
            headers: { cookie: cookieHeader },
            body: JSON.stringify({
              intent: "CREATE_CODEBOOK_VERSION",
              entityId: fakeId,
              payload: { version: 1 },
            }),
          }),
          params: { teamId: team._id, codebookId: fakeId },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("Codebook not found");
    });
  });

  describe("UPDATE_CODEBOOK", () => {
    it("updates codebook name when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const codebook = await CodebookService.create({
        name: "Original",
        description: "",
        team: team._id,
        productionVersion: 1,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UPDATE_CODEBOOK",
            entityId: codebook._id,
            payload: { name: "Updated", description: "new desc" },
          }),
        }),
        params: { teamId: team._id, codebookId: codebook._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("UPDATE_CODEBOOK");
      expect(response.data?.data?.name).toBe("Updated");
    });
  });

  describe("DELETE_CODEBOOK", () => {
    it("soft-deletes codebook when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const codebook = await CodebookService.create({
        name: "To Delete",
        description: "",
        team: team._id,
        productionVersion: 1,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "DELETE_CODEBOOK",
            entityId: codebook._id,
          }),
        }),
        params: { teamId: team._id, codebookId: codebook._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("DELETE_CODEBOOK");

      const deleted = await CodebookService.findById(codebook._id);
      expect(deleted?.deletedAt).toBeDefined();
    });
  });

  describe("IDOR scoping", () => {
    it("rejects when URL teamId does not match the codebook's team", async () => {
      const teamA = await TeamService.create({ name: "Team A" });
      const teamB = await TeamService.create({ name: "Team B" });
      // user belongs to BOTH teams — auth-only check would let this through
      const user = await UserService.create({
        username: "dual",
        teams: [
          { team: teamA._id, role: "ADMIN" },
          { team: teamB._id, role: "ADMIN" },
        ],
      });
      const codebook = await CodebookService.create({
        name: "Lives in A",
        description: "",
        team: teamA._id,
        productionVersion: 1,
        createdBy: user._id,
      });
      const cookieHeader = await loginUser(user._id);

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "PUT",
            headers: { cookie: cookieHeader },
            body: JSON.stringify({
              intent: "UPDATE_CODEBOOK",
              entityId: codebook._id,
              payload: { name: "Hacked" },
            }),
          }),
          params: { teamId: teamB._id, codebookId: codebook._id },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("Codebook not found");
    });
  });
});
