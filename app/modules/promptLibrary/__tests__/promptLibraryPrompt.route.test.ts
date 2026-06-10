import { beforeEach, describe, expect, it } from "vitest";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/promptLibraryPrompt.route";

async function publishedPromptFixture({
  name,
  description,
  teamId,
  userId,
}: {
  name: string;
  description: string;
  teamId: string;
  userId: string;
}) {
  const prompt = await PromptService.create({
    name,
    team: teamId,
    annotationType: "PER_UTTERANCE",
    productionVersion: 1,
    createdBy: userId,
  });
  await PromptVersionService.create({
    name: "v1",
    prompt: prompt._id,
    version: 1,
    userPrompt: `body for ${name}`,
    annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
    hasBeenSaved: true,
  });
  await PromptService.publish(prompt._id, {
    description,
    authors: [{ name: "Jane", affiliation: "Acme U" }],
    paperRefs: [{ title: "Paper", url: "https://example.com" }],
  });
  return prompt;
}

describe("promptLibraryPrompt.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects to /signup when there is no session cookie", async () => {
      await expectAuthRequired(() =>
        loader({
          request: new Request("http://localhost/prompt-library/x"),
          params: { promptId: "x" },
          context: {},
        } as any),
      );
    });

    it("returns the published prompt, its production version body, and active team id", async () => {
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
        name: "Talk Moves",
        description: "TM coding",
        teamId: sourceTeam._id,
        userId: author._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request(`http://localhost/prompt-library/${source._id}`, {
          headers: { cookie: cookieHeader },
        }),
        params: { promptId: source._id },
        context: {},
      } as any)) as any;

      expect(result.prompt._id).toBe(source._id);
      expect(result.prompt.library.isPublished).toBe(true);
      expect(result.prompt.library.authors[0].name).toBe("Jane");
      expect(result.promptVersion.userPrompt).toBe("body for Talk Moves");
      expect(result.activeTeamId).toBe(userTeam._id);
    });

    it("redirects to /prompt-library when the prompt is not published", async () => {
      const team = await TeamService.create({ name: "t" });
      const user = await UserService.create({
        username: "u",
        teams: [{ team: team._id, role: "ADMIN" }],
      });

      const unpublished = await PromptService.create({
        name: "Unpub",
        team: team._id,
        annotationType: "PER_UTTERANCE",
        productionVersion: 1,
        createdBy: user._id,
      });

      const cookieHeader = await loginUser(user._id);
      const result = (await loader({
        request: new Request(
          `http://localhost/prompt-library/${unpublished._id}`,
          { headers: { cookie: cookieHeader } },
        ),
        params: { promptId: unpublished._id },
        context: {},
      } as any)) as Response;

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(302);
      expect(result.headers.get("Location")).toBe("/prompt-library");
    });
  });

  describe("action - COPY_PROMPT", () => {
    it("copies the prompt into the active team and returns redirectTo", async () => {
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
        request: new Request(`http://localhost/prompt-library/${source._id}`, {
          method: "POST",
          headers: { cookie: cookieHeader },
          body: JSON.stringify({ intent: "COPY_PROMPT" }),
        }),
        params: { promptId: source._id },
        context: {},
      } as any)) as any;

      expect(result.data.success).toBe(true);
      expect(result.data.data.redirectTo).toMatch(
        new RegExp(`^/teams/${userTeam._id}/prompts/`),
      );
    });
  });
});
