import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/promptsList.route";
import { PromptService } from "../prompt";
import { PromptVersionService } from "../promptVersion";

describe("promptsList.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    await expectAuthRequired(() =>
      loader({
        request: new Request("http://localhost/"),
        params: {},
      } as any),
    );
  });

  it("returns prompts that have at least one saved version, filtered by annotationType + teamId", async () => {
    const team = await TeamService.create({ name: "team 1" });
    const teamOther = await TeamService.create({ name: "team 2" });

    const user = await UserService.create({
      username: "test_1",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const prompt = await PromptService.create({
      name: "prompt 1",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });
    await PromptVersionService.create({
      prompt: prompt._id,
      version: 1,
      name: "v1",
      userPrompt: "Do something",
      annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
      hasBeenSaved: true,
    });
    const promptOther = await PromptService.create({
      name: "prompt 2",
      annotationType: "PER_UTTERANCE",
      team: teamOther._id,
    });

    const cookieHeader = await loginUser(user._id);

    const result = (await loader({
      request: new Request("http://localhost/?annotationType=PER_UTTERANCE", {
        headers: { cookie: cookieHeader },
      }),
      params: {},
      unstable_pattern: "",
      context: {},
    } as any)) as any;

    const data = result.prompts.data;
    expect(Array.isArray(data)).toBe(true);

    const ids = data.map((d: any) => d._id ?? d.id);
    expect(ids).toContain(prompt._id);
    expect(ids).not.toContain(promptOther._id);
  });

  it("excludes prompts with no saved versions", async () => {
    const team = await TeamService.create({ name: "team" });
    const user = await UserService.create({
      username: "test",
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const promptWithSavedVersion = await PromptService.create({
      name: "saved prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });
    await PromptVersionService.create({
      prompt: promptWithSavedVersion._id,
      version: 1,
      name: "v1",
      userPrompt: "Do something",
      annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
      hasBeenSaved: true,
    });

    const promptWithNoVersions = await PromptService.create({
      name: "empty prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });

    const promptWithOnlyUnsavedVersion = await PromptService.create({
      name: "unsaved prompt",
      annotationType: "PER_UTTERANCE",
      team: team._id,
    });
    await PromptVersionService.create({
      prompt: promptWithOnlyUnsavedVersion._id,
      version: 1,
      name: "v1",
      userPrompt: "",
      annotationSchema: [],
      hasBeenSaved: false,
    });

    const cookieHeader = await loginUser(user._id);

    const result = (await loader({
      request: new Request("http://localhost/?annotationType=PER_UTTERANCE", {
        headers: { cookie: cookieHeader },
      }),
      params: {},
      unstable_pattern: "",
      context: {},
    } as any)) as any;

    const ids = result.prompts.data.map((d: any) => d._id ?? d.id);
    expect(ids).toContain(promptWithSavedVersion._id);
    expect(ids).not.toContain(promptWithNoVersions._id);
    expect(ids).not.toContain(promptWithOnlyUnsavedVersion._id);
  });

  it("throws when annotationType is invalid", async () => {
    const team = await TeamService.create({ name: "team" });
    const user = await UserService.create({
      username: "test",
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const cookieHeader = await loginUser(user._id);

    await expect(
      loader({
        request: new Request("http://localhost/?annotationType=NOPE", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        unstable_pattern: "",
        context: {},
      } as any),
    ).rejects.toThrow(/Invalid or missing annotationType/);
  });

  it("scopes prompts to the requested team when the user belongs to it", async () => {
    const teamA = await TeamService.create({ name: "team A" });
    const teamB = await TeamService.create({ name: "team B" });

    const user = await UserService.create({
      username: "multi_team",
      teams: [
        { team: teamA._id, role: "ADMIN" },
        { team: teamB._id, role: "ADMIN" },
      ],
    });

    const promptA = await PromptService.create({
      name: "shared prompt",
      annotationType: "PER_UTTERANCE",
      team: teamA._id,
    });
    await PromptVersionService.create({
      prompt: promptA._id,
      version: 1,
      name: "v1",
      userPrompt: "Do something",
      annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
      hasBeenSaved: true,
    });

    const promptB = await PromptService.create({
      name: "shared prompt",
      annotationType: "PER_UTTERANCE",
      team: teamB._id,
    });
    await PromptVersionService.create({
      prompt: promptB._id,
      version: 1,
      name: "v1",
      userPrompt: "Do something",
      annotationSchema: [{ fieldKey: "label", value: "", isSystem: false }],
      hasBeenSaved: true,
    });

    const cookieHeader = await loginUser(user._id);

    const result = (await loader({
      request: new Request(
        `http://localhost/?annotationType=PER_UTTERANCE&team=${teamA._id}`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {},
      unstable_pattern: "",
      context: {},
    } as any)) as any;

    const ids = result.prompts.data.map((d: any) => d._id ?? d.id);
    expect(ids).toContain(promptA._id);
    expect(ids).not.toContain(promptB._id);
  });

  it("returns 403 when requesting a team the user does not belong to", async () => {
    const team = await TeamService.create({ name: "user team" });
    const otherTeam = await TeamService.create({ name: "other team" });
    const user = await UserService.create({
      username: "limited",
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const cookieHeader = await loginUser(user._id);

    await expect(
      loader({
        request: new Request(
          `http://localhost/?annotationType=PER_UTTERANCE&team=${otherTeam._id}`,
          { headers: { cookie: cookieHeader } },
        ),
        params: {},
        unstable_pattern: "",
        context: {},
      } as any),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws when annotationType is missing", async () => {
    const team = await TeamService.create({ name: "team" });
    const user = await UserService.create({
      username: "test",
      teams: [{ team: team._id, role: "ADMIN" }],
    });

    const cookieHeader = await loginUser(user._id);

    await expect(
      loader({
        request: new Request("http://localhost/", {
          headers: { cookie: cookieHeader },
        }),
        params: {},
        unstable_pattern: "",
        context: {},
      } as any),
    ).rejects.toThrow(/Invalid or missing annotationType/);
  });
});
