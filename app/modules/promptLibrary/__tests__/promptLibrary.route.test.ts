import { beforeEach, describe, expect, it } from "vitest";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/promptLibrary.route";

async function publishedPromptFixture({
  name,
  description,
  teamId,
  userId,
  annotationType = "PER_UTTERANCE",
}: {
  name: string;
  description: string;
  teamId: string;
  userId: string;
  annotationType?: "PER_UTTERANCE" | "PER_SESSION";
}) {
  const prompt = await PromptService.create({
    name,
    team: teamId,
    annotationType,
    productionVersion: 1,
    createdBy: userId,
  });
  await PromptVersionService.create({
    name: "v1",
    prompt: prompt._id,
    version: 1,
    userPrompt: `User prompt for ${name}`,
    annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
    hasBeenSaved: true,
  });
  await PromptService.publish(prompt._id, {
    description,
    paperRefs: [{ title: "Paper", url: "https://example.com" }],
  });
  return prompt;
}

describe("promptLibrary.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to /signup when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/prompt-library"),
          params: {},
          context: {},
        } as any),
      );
    });

    it("returns only published prompts, with active team id", async () => {
      const sourceTeam = await TeamService.create({ name: "source" });
      const userTeam = await TeamService.create({ name: "mine" });
      const author = await UserService.create({
        username: "author",
        teams: [{ team: sourceTeam._id, role: "ADMIN" }],
      });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: userTeam._id, role: "ADMIN" }],
      });

      const published = await publishedPromptFixture({
        name: "Talk Moves",
        description: "TM coding",
        teamId: sourceTeam._id,
        userId: author._id,
      });

      await PromptService.create({
        name: "Unpublished",
        team: sourceTeam._id,
        annotationType: "PER_UTTERANCE",
        productionVersion: 1,
        createdBy: author._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request("http://localhost/prompt-library", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        context: {},
      } as any)) as any;

      const ids = result.prompts.data.map((p: any) => p._id);
      expect(ids).toEqual([published._id]);
      expect(result.activeTeamId).toBe(userTeam._id);
    });

    it("filters by annotationType", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const perUtterance = await publishedPromptFixture({
        name: "PU",
        description: "x",
        teamId: team._id,
        userId: user._id,
        annotationType: "PER_UTTERANCE",
      });
      await publishedPromptFixture({
        name: "PS",
        description: "y",
        teamId: team._id,
        userId: user._id,
        annotationType: "PER_SESSION",
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request(
          "http://localhost/prompt-library?filter_annotationType=PER_UTTERANCE",
          { headers: { cookie: cookieHeader } },
        ),
        params: {},
        context: {},
      } as any)) as any;

      const ids = result.prompts.data.map((p: any) => p._id);
      expect(ids).toEqual([perUtterance._id]);
    });

    it("searches across name, description, and authors", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const named = await publishedPromptFixture({
        name: "Unique-Name-Token",
        description: "general",
        teamId: team._id,
        userId: user._id,
      });
      await publishedPromptFixture({
        name: "other",
        description: "other description",
        teamId: team._id,
        userId: user._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request(
          "http://localhost/prompt-library?searchValue=Unique-Name-Token",
          { headers: { cookie: cookieHeader } },
        ),
        params: {},
        context: {},
      } as any)) as any;

      const ids = result.prompts.data.map((p: any) => p._id);
      expect(ids).toEqual([named._id]);
    });

    it("excludes soft-deleted prompts even if still marked published", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const live = await publishedPromptFixture({
        name: "Live",
        description: "x",
        teamId: team._id,
        userId: user._id,
      });
      const deleted = await publishedPromptFixture({
        name: "Deleted",
        description: "y",
        teamId: team._id,
        userId: user._id,
      });
      await PromptService.updateById(deleted._id, { deletedAt: new Date() });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request("http://localhost/prompt-library", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        context: {},
      } as any)) as any;

      const ids = result.prompts.data.map((p: any) => p._id);
      expect(ids).toEqual([live._id]);
    });
  });

  describe("action - COPY_PROMPT", () => {
    it("copies the library prompt into the active team and returns redirect to the new prompt", async () => {
      const sourceTeam = await TeamService.create({ name: "source" });
      const userTeam = await TeamService.create({ name: "mine" });
      const author = await UserService.create({
        username: "author",
        teams: [{ team: sourceTeam._id, role: "ADMIN" }],
      });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: userTeam._id, role: "ADMIN" }],
      });

      const source = await publishedPromptFixture({
        name: "Source",
        description: "x",
        teamId: sourceTeam._id,
        userId: author._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await action({
        request: new Request("http://localhost/prompt-library", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "COPY_PROMPT",
            entityId: source._id,
          }),
        }),
        params: {},
        context: {},
      } as any)) as any;

      expect(result.data.success).toBe(true);
      expect(result.data.intent).toBe("COPY_PROMPT");
      expect(result.data.data.redirectTo).toMatch(
        new RegExp(`^/teams/${userTeam._id}/prompts/`),
      );

      const teamPrompts = await PromptService.find({
        match: { team: userTeam._id },
      });
      expect(teamPrompts).toHaveLength(1);
      expect(teamPrompts[0].name).toBe("Source");
    });

    it("returns 404 when the library prompt does not exist or is not published", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const unpublished = await PromptService.create({
        name: "Unpublished",
        team: team._id,
        annotationType: "PER_UTTERANCE",
        productionVersion: 1,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await action({
        request: new Request("http://localhost/prompt-library", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({
            intent: "COPY_PROMPT",
            entityId: unpublished._id,
          }),
        }),
        params: {},
        context: {},
      } as any)) as any;

      expect(result.init?.status).toBe(404);
    });

    it("redirects to /signup when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        action({
          request: new Request("http://localhost/prompt-library", {
            method: "POST",
            body: JSON.stringify({
              intent: "COPY_PROMPT",
              entityId: "000000000000000000000000",
            }),
          }),
          params: {},
          context: {},
        } as any),
      );
    });

    it("ignores a cookie pointing at a team the user does not belong to and copies into their actual team", async () => {
      const sourceTeam = await TeamService.create({ name: "source" });
      const userTeam = await TeamService.create({ name: "mine" });
      const otherTeam = await TeamService.create({ name: "not mine" });
      const author = await UserService.create({
        username: "author",
        teams: [{ team: sourceTeam._id, role: "ADMIN" }],
      });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: userTeam._id, role: "ADMIN" }],
      });

      const source = await publishedPromptFixture({
        name: "Source",
        description: "x",
        teamId: sourceTeam._id,
        userId: author._id,
      });

      const cookieHeader = await loginUser(user._id);
      await action({
        request: new Request("http://localhost/prompt-library", {
          method: "POST",
          headers: {
            cookie: `${cookieHeader}; sandpiper.activeTeamId=${otherTeam._id}`,
          },
          body: JSON.stringify({
            intent: "COPY_PROMPT",
            entityId: source._id,
          }),
        }),
        params: {},
        context: {},
      } as any);

      const otherTeamPrompts = await PromptService.find({
        match: { team: otherTeam._id },
      });
      expect(otherTeamPrompts).toHaveLength(0);

      const userTeamPrompts = await PromptService.find({
        match: { team: userTeam._id },
      });
      expect(userTeamPrompts).toHaveLength(1);
      expect(userTeamPrompts[0].name).toBe("Source");
    });

    it("rejects unknown intents with 400", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await action({
        request: new Request("http://localhost/prompt-library", {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ intent: "DELETE_PROMPT", entityId: "x" }),
        }),
        params: {},
        context: {},
      } as any)) as any;

      expect(result.init?.status).toBe(400);
    });
  });
});
