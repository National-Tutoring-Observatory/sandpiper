import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { loader } from "../containers/promptEditor.route";
import { PromptService } from "../prompt";
import { PromptVersionService } from "../promptVersion";

describe("promptEditor.route loader", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns the prompt and version when teamId and promptId match", async () => {
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
    await PromptVersionService.create({
      name: "v1",
      prompt: prompt._id,
      version: 1,
      annotationSchema: [],
    });
    const cookieHeader = await loginUser(user._id);

    const result = (await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/prompts/${prompt._id}/1`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, promptId: prompt._id, version: "1" },
      context: {},
      unstable_pattern: "",
    } as any)) as any;

    expect(result.prompt?.data?._id).toBe(prompt._id);
    expect(result.promptVersion?.data?.version).toBe(1);
  });

  it("redirects when the prompt belongs to a different team (IDOR)", async () => {
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
    await PromptVersionService.create({
      name: "v1",
      prompt: victimPrompt._id,
      version: 1,
      annotationSchema: [],
    });
    const cookieHeader = await loginUser(attacker._id);

    const res = (await loader({
      request: new Request(
        `http://localhost/teams/${teamB._id}/prompts/${victimPrompt._id}/1`,
        { headers: { cookie: cookieHeader } },
      ),
      params: {
        teamId: teamB._id,
        promptId: victimPrompt._id,
        version: "1",
      },
      context: {},
      unstable_pattern: "",
    } as any)) as Response;

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Location")).toBe("/");
  });

  it("redirects when the prompt does not exist", async () => {
    const team = await TeamService.create({ name: "team" });
    const user = await UserService.create({
      username: "user",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const cookieHeader = await loginUser(user._id);
    const fakeId = new Types.ObjectId().toString();

    const res = (await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/prompts/${fakeId}/1`,
        { headers: { cookie: cookieHeader } },
      ),
      params: { teamId: team._id, promptId: fakeId, version: "1" },
      context: {},
      unstable_pattern: "",
    } as any)) as Response;

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Location")).toBe("/");
  });
});
