import type { Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodebookService } from "~/modules/codebooks/codebook";
import { CodebookVersionService } from "~/modules/codebooks/codebookVersion";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import type { ControllerContext } from "../../api/api.types";
import { PromptService } from "../prompt";
import {
  checkPromptAlignment,
  createNextPromptVersion,
  createPrompt,
  deletePromptById,
  getPromptById,
  getPromptsByActiveTeam,
  getPromptVersion,
  getPromptVersions,
  getSavedPrompts,
  makePromptVersionProduction,
  publishPrompt,
  suggestPromptChanges,
  unpublishPrompt,
  updatePromptById,
  updatePromptVersion,
} from "../prompts.services";
import type { Prompt } from "../prompts.types";
import { PromptVersionService } from "../promptVersion";
import checkPromptAndAnnotationSchemaAlignment from "../services/checkPromptAndAnnotationSchemaAlignment.server";

vi.mock("../services/checkPromptAndAnnotationSchemaAlignment.server", () => ({
  default: vi.fn(async () => ({ alignmentScore: 1, reasoning: "ok" })),
}));
vi.mock("../services/suggestPromptAndAnnotationSchemaChanges.server", () => ({
  default: vi.fn(async () => ({ prompt: "p", annotationSchema: [] })),
}));

let admin: User;
let member: User;
let superAdmin: User;
let teamId: string;
let otherTeamId: string;

function makeContext(
  user: User = admin,
  activeTeam: string | null = teamId,
): ControllerContext {
  return { req: {} as Request, res: {} as Response, user, activeTeam };
}

async function createPromptInTeam(
  team: string,
  createdBy: string,
  { hasBeenSaved = false, userPrompt = "" } = {},
) {
  const prompt = await PromptService.create({
    name: "Prompt",
    annotationType: "PER_UTTERANCE",
    team,
    productionVersion: 1,
    createdBy,
  });
  await PromptVersionService.create({
    name: "initial",
    prompt: prompt._id,
    version: 1,
    userPrompt,
    annotationSchema: [],
    hasBeenSaved,
  });
  return prompt;
}

beforeEach(async () => {
  await clearDocumentDB();
  teamId = new Types.ObjectId().toString();
  otherTeamId = new Types.ObjectId().toString();
  admin = await UserService.create({
    username: "admin",
    teams: [{ team: teamId, role: "ADMIN" }],
  });
  member = await UserService.create({
    username: "member",
    teams: [{ team: teamId, role: "MEMBER" }],
  });
  superAdmin = await UserService.create({
    username: "super",
    role: "SUPER_ADMIN",
    teams: [{ team: teamId, role: "ADMIN" }],
  });
});

describe("getPromptsByActiveTeam", () => {
  it("lists non-deleted prompts in the active team, filtered by annotation type", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);
    const deleted = await createPromptInTeam(teamId, admin._id);
    await PromptService.updateById(deleted._id, { deletedAt: new Date() });
    const perSession = await PromptService.create({
      name: "Session",
      annotationType: "PER_SESSION",
      team: teamId,
      productionVersion: 1,
      createdBy: admin._id,
    });
    await createPromptInTeam(otherTeamId, admin._id);

    const all = await getPromptsByActiveTeam({}, makeContext());
    const filtered = await getPromptsByActiveTeam(
      { annotationType: "PER_UTTERANCE" },
      makeContext(),
    );

    expect(all.data.map((p) => p._id).sort()).toEqual(
      [prompt._id, perSession._id].sort(),
    );
    expect(filtered.data.map((p) => p._id)).toEqual([prompt._id]);
  });

  it("throws 400 without an active team", async () => {
    await expect(
      getPromptsByActiveTeam({}, makeContext(admin, null)),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("getSavedPrompts", () => {
  it("returns only active-team prompts with a saved version", async () => {
    const saved = await createPromptInTeam(teamId, admin._id, {
      hasBeenSaved: true,
    });
    await createPromptInTeam(teamId, admin._id);
    await createPromptInTeam(otherTeamId, admin._id, { hasBeenSaved: true });

    const { data } = await getSavedPrompts(
      { annotationType: "PER_UTTERANCE" },
      makeContext(),
    );

    expect(data.map((p) => p._id)).toEqual([saved._id]);
  });
});

describe("createPrompt", () => {
  it("creates the prompt with an initial version holding the system fields", async () => {
    const { data } = await createPrompt(
      { name: "New", annotationType: "PER_UTTERANCE" },
      makeContext(member),
    );

    expect(data.team).toBe(teamId);
    expect(data.createdBy).toBe(member._id);
    const versions = await PromptVersionService.find({
      match: { prompt: data._id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].annotationSchema.map((f) => f.fieldKey)).toEqual([
      "_id",
      "identifiedBy",
      "reasoning",
    ]);
  });
});

describe("prompt scoping", () => {
  let foreignPrompt: Prompt;

  beforeEach(async () => {
    foreignPrompt = await createPromptInTeam(otherTeamId, admin._id);
  });

  it.each([
    [
      "getPromptById",
      () => getPromptById({ promptId: foreignPrompt._id }, makeContext()),
    ],
    [
      "updatePromptById",
      () =>
        updatePromptById(
          { promptId: foreignPrompt._id, name: "Hacked" },
          makeContext(),
        ),
    ],
    [
      "deletePromptById",
      () => deletePromptById({ promptId: foreignPrompt._id }, makeContext()),
    ],
    [
      "getPromptVersions",
      () => getPromptVersions({ promptId: foreignPrompt._id }, makeContext()),
    ],
    [
      "getPromptVersion",
      () =>
        getPromptVersion(
          { promptId: foreignPrompt._id, version: 1 },
          makeContext(),
        ),
    ],
    [
      "checkPromptAlignment",
      () =>
        checkPromptAlignment(
          { promptId: foreignPrompt._id, userPrompt: "", annotationSchema: [] },
          makeContext(),
        ),
    ],
  ])("%s returns 404 for a prompt in another team", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 404 for an invalid id", async () => {
    await expect(
      getPromptById({ promptId: "not-an-id" }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updatePromptById / deletePromptById", () => {
  it("lets the creator rename their own prompt", async () => {
    const prompt = await createPromptInTeam(teamId, member._id);

    const { data } = await updatePromptById(
      { promptId: prompt._id, name: "Renamed" },
      makeContext(member),
    );

    expect(data?.name).toBe("Renamed");
  });

  it("rejects members changing someone else's prompt with 403", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);

    await expect(
      deletePromptById({ promptId: prompt._id }, makeContext(member)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("soft deletes the prompt", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);

    const { data } = await deletePromptById(
      { promptId: prompt._id },
      makeContext(),
    );

    expect(data.deleted).toBe(true);
    const stored = await PromptService.findById(prompt._id);
    expect(stored?.deletedAt).toBeDefined();
  });

  it("returns 400 when the prompt is published", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id, {
      userPrompt: "Annotate",
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });

    await expect(
      deletePromptById({ promptId: prompt._id }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("returns 400 when an active run uses the prompt", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);
    const project = await ProjectService.create({
      name: "project",
      team: teamId,
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
      createdBy: admin._id,
    });

    await expect(
      deletePromptById({ promptId: prompt._id }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("publishPrompt / unpublishPrompt", () => {
  it("publishes and unpublishes for a super admin", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id, {
      userPrompt: "Annotate",
    });

    const published = await publishPrompt(
      {
        promptId: prompt._id,
        description: "Desc",
        authors: [{ name: " Ada ", affiliation: "" }],
        paperRefs: [{ title: "", url: "" }],
      },
      makeContext(superAdmin),
    );
    expect(published.data?.library?.isPublished).toBe(true);
    expect(published.data?.library?.authors).toEqual([{ name: "Ada" }]);
    expect(published.data?.library?.paperRefs).toEqual([]);

    const unpublished = await unpublishPrompt(
      { promptId: prompt._id },
      makeContext(superAdmin),
    );
    expect(unpublished.data?.library?.isPublished).toBe(false);
  });

  it("rejects non super admins with 403", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id, {
      userPrompt: "Annotate",
    });

    await expect(
      publishPrompt(
        { promptId: prompt._id, description: "Desc" },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(
      unpublishPrompt({ promptId: prompt._id }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("returns 400 when the production version has no prompt text", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);

    await expect(
      publishPrompt(
        { promptId: prompt._id, description: "Desc" },
        makeContext(superAdmin),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("prompt versions", () => {
  let prompt: Prompt;

  beforeEach(async () => {
    prompt = await createPromptInTeam(teamId, admin._id);
  });

  it("lists versions newest first, optionally only saved ones", async () => {
    await createNextPromptVersion(
      { promptId: prompt._id, version: 1 },
      makeContext(),
    );
    await updatePromptVersion(
      {
        promptId: prompt._id,
        version: 2,
        name: "Saved",
        userPrompt: "Annotate",
        annotationSchema: [],
      },
      makeContext(),
    );

    const all = await getPromptVersions(
      { promptId: prompt._id },
      makeContext(),
    );
    const saved = await getPromptVersions(
      { promptId: prompt._id, hasBeenSaved: true },
      makeContext(),
    );

    expect(all.data.map((v) => v.version)).toEqual([2, 1]);
    expect(saved.data.map((v) => v.version)).toEqual([2]);
  });

  it("returns 400 when the previous version does not exist", async () => {
    await expect(
      createNextPromptVersion(
        { promptId: prompt._id, version: 5 },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("does not read a version that belongs to another prompt", async () => {
    const other = await createPromptInTeam(teamId, admin._id);
    await createNextPromptVersion(
      { promptId: other._id, version: 1 },
      makeContext(),
    );

    await expect(
      getPromptVersion({ promptId: prompt._id, version: 2 }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("includes the linked codebook and system prompt when reading a version", async () => {
    const codebook = await CodebookService.create({
      name: "Codebook",
      description: "",
      team: teamId,
      productionVersion: 1,
      createdBy: admin._id,
    });
    const codebookVersion = await CodebookVersionService.create({
      codebook: codebook._id,
      version: 3,
      categories: [],
    });
    const linked = await PromptVersionService.findOne({
      prompt: prompt._id,
      version: 1,
    });
    await PromptVersionService.updateById(String(linked?._id), {
      codebook: codebook._id,
      codebookVersion: codebookVersion._id,
    });

    const { data } = await getPromptVersion(
      { promptId: prompt._id, version: 1 },
      makeContext(),
    );

    expect(data.linkedCodebook).toEqual({
      _id: codebook._id,
      name: "Codebook",
      version: 3,
      teamId,
    });
    expect(data.systemPrompt).toEqual(expect.any(String));
  });

  it("adds missing system fields and token counts when saving", async () => {
    const { data } = await updatePromptVersion(
      {
        promptId: prompt._id,
        version: 1,
        name: "Updated",
        userPrompt: "Annotate",
        annotationSchema: [{ isSystem: false, fieldKey: "label", value: "" }],
      },
      makeContext(),
    );

    expect(data?.hasBeenSaved).toBe(true);
    expect(data?.annotationSchema.map((f) => f.fieldKey)).toEqual([
      "_id",
      "identifiedBy",
      "reasoning",
      "label",
    ]);
    expect(data?.inputTokens).toBeGreaterThan(0);
  });

  it("makes an existing version production", async () => {
    await createNextPromptVersion(
      { promptId: prompt._id, version: 1 },
      makeContext(),
    );

    const { data } = await makePromptVersionProduction(
      { promptId: prompt._id, version: 2 },
      makeContext(),
    );

    expect(data?.productionVersion).toBe(2);
  });

  it("rejects making a missing version production with 404", async () => {
    await expect(
      makePromptVersionProduction(
        { promptId: prompt._id, version: 9 },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("alignment", () => {
  it("passes the active team and user to the alignment check", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);

    const { data } = await checkPromptAlignment(
      { promptId: prompt._id, userPrompt: "Annotate", annotationSchema: [] },
      makeContext(),
    );

    expect(data).toEqual({ alignmentScore: 1, reasoning: "ok" });
    expect(checkPromptAndAnnotationSchemaAlignment).toHaveBeenCalledWith(
      expect.objectContaining({
        team: teamId,
        promptId: prompt._id,
        userId: admin._id,
      }),
    );
  });

  it("returns suggestions", async () => {
    const prompt = await createPromptInTeam(teamId, admin._id);

    const { data } = await suggestPromptChanges(
      {
        promptId: prompt._id,
        userPrompt: "Annotate",
        annotationSchema: [],
        alignmentScore: 0.2,
        reasoning: "weak",
      },
      makeContext(),
    );

    expect(data).toEqual({ prompt: "p", annotationSchema: [] });
  });
});
