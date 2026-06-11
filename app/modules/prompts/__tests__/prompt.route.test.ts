import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { RunService } from "~/modules/runs/run";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/prompt.route";
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
        params: { teamId: team._id, promptId: prompt._id },
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
          params: { teamId: team._id, promptId: prompt._id },
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
          params: { teamId: team._id, promptId: fakeId },
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
        params: { teamId: team._id, promptId: prompt._id },
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
        params: { teamId: team._id, promptId: prompt._id },
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
        params: { teamId: team._id, promptId: prompt._id },
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
        params: { teamId: team._id, promptId: prompt._id },
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
          params: { teamId: team._id, promptId: prompt._id },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("You do not have permission to update this prompt.");
    });

    it("returns 400 when prompt is published to the library", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "test_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const prompt = await PromptService.create({
        name: "Published",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });
      await PromptService.publish(prompt._id, {
        description: "x",
        paperRefs: [],
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
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("Unpublish");

      const stillThere = await PromptService.findById(prompt._id);
      expect(stillThere?.deletedAt).toBeUndefined();
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
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("active run");
    });
  });

  describe("PUBLISH_PROMPT", () => {
    it("publishes when user is a super admin", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "To Publish",
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
        hasBeenSaved: true,
      });
      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "PUBLISH_PROMPT",
            entityId: prompt._id,
            payload: {
              description: "  A great prompt  ",
              authors: [
                { name: "  Ada Lovelace  ", affiliation: "Cornell" },
                { name: "" },
              ],
              paperRefs: [
                { title: "  Paper One  ", url: "https://example.com/1" },
                { title: "missing url", url: "" },
              ],
            },
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("PUBLISH_PROMPT");

      const updated = await PromptService.findById(prompt._id);
      expect(updated?.library?.isPublished).toBe(true);
      expect(updated?.library?.description).toBe("A great prompt");
      expect(updated?.library?.authors).toEqual([
        { name: "Ada Lovelace", affiliation: "Cornell" },
      ]);
      expect(updated?.library?.paperRefs).toEqual([
        { title: "Paper One", url: "https://example.com/1" },
      ]);
      expect(updated?.library?.publishedAt).toBeDefined();
    });

    it("returns 403 when user is not a super admin", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "regular_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "Cannot Publish",
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
            intent: "PUBLISH_PROMPT",
            entityId: prompt._id,
            payload: { description: "x", authors: [], paperRefs: [] },
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(403);

      const unchanged = await PromptService.findById(prompt._id);
      expect(unchanged?.library?.isPublished).not.toBe(true);
    });

    it("returns 400 when description is missing", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "Needs Desc",
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
            intent: "PUBLISH_PROMPT",
            entityId: prompt._id,
            payload: { authors: [], paperRefs: [] },
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("Description");
    });

    it("returns 400 when description is only whitespace", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "Blank Desc",
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
        hasBeenSaved: true,
      });
      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "PUBLISH_PROMPT",
            entityId: prompt._id,
            payload: { description: "   ", authors: [], paperRefs: [] },
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("Description");

      const unchanged = await PromptService.findById(prompt._id);
      expect(unchanged?.library?.isPublished).not.toBe(true);
    });

    it("returns 400 when the prompt has no saved production version", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "No Version",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
        productionVersion: 1,
      });
      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "PUBLISH_PROMPT",
            entityId: prompt._id,
            payload: {
              description: "A great prompt",
              authors: [],
              paperRefs: [],
            },
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(400);
      expect(response.data?.errors?.general).toContain("production version");

      const unchanged = await PromptService.findById(prompt._id);
      expect(unchanged?.library?.isPublished).not.toBe(true);
    });
  });

  describe("UNPUBLISH_PROMPT", () => {
    it("unpublishes when user is a super admin", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "admin",
        role: "SUPER_ADMIN",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "Will Unpublish",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });
      await PromptService.publish(prompt._id, {
        description: "x",
        paperRefs: [],
      });
      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UNPUBLISH_PROMPT",
            entityId: prompt._id,
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.data?.success).toBe(true);
      expect(response.data?.intent).toBe("UNPUBLISH_PROMPT");

      const updated = await PromptService.findById(prompt._id);
      expect(updated?.library?.isPublished).toBe(false);
    });

    it("returns 403 when user is not a super admin", async () => {
      const team = await TeamService.create({ name: "team 1" });
      const user = await UserService.create({
        username: "regular_admin",
        teams: [{ team: team._id, role: "ADMIN" }],
      });
      const prompt = await PromptService.create({
        name: "Cannot Unpublish",
        annotationType: "PER_UTTERANCE",
        team: team._id,
        createdBy: user._id,
      });
      // publish via service (bypassing the gate)
      await PromptService.publish(prompt._id, {
        description: "x",
        paperRefs: [],
      });
      const cookieHeader = await loginUser(user._id);

      const response = (await action({
        request: new Request("http://localhost/", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "UNPUBLISH_PROMPT",
            entityId: prompt._id,
          }),
        }),
        params: { teamId: team._id, promptId: prompt._id },
        context: {},
        unstable_pattern: "",
      } as any)) as any;

      expect(response.init?.status).toBe(403);

      const stillPublished = await PromptService.findById(prompt._id);
      expect(stillPublished?.library?.isPublished).toBe(true);
    });
  });

  describe("IDOR scoping", () => {
    it("rejects when URL teamId does not match the prompt's team", async () => {
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
      const prompt = await PromptService.create({
        name: "Lives in A",
        annotationType: "PER_UTTERANCE",
        team: teamA._id,
        createdBy: user._id,
      });
      const cookieHeader = await loginUser(user._id);

      await expect(
        action({
          request: new Request("http://localhost/", {
            method: "PUT",
            headers: { cookie: cookieHeader },
            body: JSON.stringify({
              intent: "UPDATE_PROMPT",
              entityId: prompt._id,
              payload: { name: "hijack" },
            }),
          }),
          params: { teamId: teamB._id, promptId: prompt._id },
          context: {},
          unstable_pattern: "",
        } as any),
      ).rejects.toThrow("Prompt not found");

      const unchanged = await PromptService.findById(prompt._id);
      expect(unchanged?.name).toBe("Lives in A");
    });
  });
});

describe("prompt.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns the prompt when teamId and promptId match", async () => {
    const team = await TeamService.create({ name: "team A" });
    const user = await UserService.create({
      username: "owner",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const prompt = await PromptService.create({
      name: "Owned",
      annotationType: "PER_UTTERANCE",
      team: team._id,
      createdBy: user._id,
    });
    const cookieHeader = await loginUser(user._id);

    const result = (await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/prompts/${prompt._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, promptId: prompt._id },
      context: {},
      unstable_pattern: "",
    } as any)) as any;

    expect(result.prompt?._id).toBe(prompt._id);
    expect(Array.isArray(result.promptVersions)).toBe(true);
  });

  it("redirects to the team's prompts list when the prompt belongs to a different team (IDOR)", async () => {
    const teamA = await TeamService.create({ name: "Team A" });
    const teamB = await TeamService.create({ name: "Team B" });
    const owner = await UserService.create({
      username: "owner",
      teams: [{ team: teamA._id, role: "ADMIN" }],
    });
    const attacker = await UserService.create({
      username: "attacker",
      teams: [{ team: teamB._id, role: "ADMIN" }],
    });
    const victimPrompt = await PromptService.create({
      name: "Victim",
      annotationType: "PER_UTTERANCE",
      team: teamA._id,
      createdBy: owner._id,
    });
    const cookieHeader = await loginUser(attacker._id);

    const res = (await loader({
      request: new Request(
        `http://localhost/teams/${teamB._id}/prompts/${victimPrompt._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: teamB._id, promptId: victimPrompt._id },
      context: {},
      unstable_pattern: "",
    } as any)) as Response;

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Location")).toBe(`/teams/${teamB._id}/prompts`);
  });

  it("redirects to the team's prompts list when the prompt does not exist", async () => {
    const team = await TeamService.create({ name: "team" });
    const user = await UserService.create({
      username: "user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);
    const fakeId = new Types.ObjectId().toString();

    const res = (await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/prompts/${fakeId}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, promptId: fakeId },
      context: {},
      unstable_pattern: "",
    } as any)) as Response;

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Location")).toBe(`/teams/${team._id}/prompts`);
  });
});
