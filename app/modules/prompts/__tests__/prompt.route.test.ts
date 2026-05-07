import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { RunService } from "~/modules/runs/run";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action } from "../containers/prompt.route";
import { PromptService } from "../prompt";
import { PromptVersionService } from "../promptVersion";

describe("prompt.route action", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("CREATE_PROMPT_VERSION", () => {
    it("creates a new prompt version when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Test Prompt",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      await PromptVersionService.create({
        name: "Version 1",
        prompt: prompt._id,
        version: 1,
        userPrompt: "Test prompt text",
        annotationSchema: [],
        hasBeenSaved: true,
        updatedAt: new Date().toISOString(),
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_PROMPT_VERSION",
            entityId: prompt._id,
            payload: { version: 1 },
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("CREATE_PROMPT_VERSION");
      expect(response.data?.data?.prompt).toBe(prompt._id);
      expect(response.data?.data?.version).toBe(2);
      expect(response.data?.data?.name).toContain("Version 1 #2");
    });

    it("denies prompt version creation when user is not authenticated", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_user",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Test Prompt",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      await expectAuthRequired(() =>
        action({
          request: new Request("http://localhost/", {
            method: "POST",
            body: JSON.stringify({
              intent: "CREATE_PROMPT_VERSION",
              entityId: prompt._id,
              payload: { version: 1 },
            }),
          }),
          params: { id: prompt._id },
          context: {},
          unstable_pattern: "",
        } as any),
      );
    });

    it("throws when prompt does not exist", async () => {
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
              intent: "CREATE_PROMPT_VERSION",
              entityId: fakeId,
              payload: { version: 1 },
            }),
          }),
          params: { id: fakeId },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("Prompt not found");
    });

    it("returns error when previous version does not exist", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Test Prompt",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "CREATE_PROMPT_VERSION",
            entityId: prompt._id,
            payload: { version: 999 },
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain(
        "Previous prompt version not found",
      );
    });
  });

  describe("UPDATE_PROMPT", () => {
    it("updates prompt name when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Original Name",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UPDATE_PROMPT",
            entityId: prompt._id,
            payload: { name: "Updated Name" },
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("UPDATE_PROMPT");
    });

    it("returns error when name is missing", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Test Prompt",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "PUT",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UPDATE_PROMPT",
            entityId: prompt._id,
            payload: {},
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain(
        "Prompt name is required",
      );
    });
  });

  describe("DELETE_PROMPT", () => {
    it("soft-deletes prompt when user is authorized", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "To Delete",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "DELETE_PROMPT",
            entityId: prompt._id,
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("DELETE_PROMPT");

      const deleted = await PromptService.findById(prompt._id);
      expect(deleted?.deletedAt).toBeDefined();
    });

    it("throws when user cannot manage prompt", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const otherTeam = await TeamService.create({ name: "team 2" });
      const owner = await UserService.create({
        username: "owner",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const otherUser = await UserService.create({
        username: "other",
        teams: [{ team: otherTeam._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Not Yours",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: owner._id,
      });

      const cookieHeader = await loginUser(otherUser._id);

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "POST",
            headers: { cookie: cookieHeader },
            body: JSON.stringify({
              intent: "DELETE_PROMPT",
              entityId: prompt._id,
            }),
          }),
          params: { id: prompt._id },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("You do not have permission to update this prompt.");
    });

    it("returns 400 when prompt has active runs", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Has Runs",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
        productionVersion: 1,
      });

      await PromptVersionService.create({
        name: "v1",
        prompt: prompt._id,
        version: 1,
        userPrompt: "Annotate this utterance",
        annotationSchema: [],
      });

      const { ProjectService } = await import("~/modules/projects/project");
      const project = await ProjectService.create({
        name: "test project",
        team: team._id,
      });

      await RunService.create({
        name: "active run",
        prompt: prompt._id,
        promptVersion: 1,
        project: project._id,
        annotationType: "PER_UTTERANCE",
        modelCode: "openai.gpt-5-mini",
        sessions: [],
        shouldRunVerification: false,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "DELETE_PROMPT",
            entityId: prompt._id,
          }),
        }),
        params: { id: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("active run");
    });
  });
});
