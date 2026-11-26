import type { Request, Response } from "express";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import type { ControllerContext } from "../../api/api.types";
import { CodebookService } from "../codebook";
import {
  createCodebook,
  createNextCodebookVersion,
  createPromptFromCodebook,
  deleteCodebookById,
  getCodebookById,
  getCodebooksByActiveTeam,
  getCodebookVersion,
  getCodebookVersions,
  makeCodebookVersionProduction,
  updateCodebookById,
  updateCodebookVersion,
} from "../codebooks.services";
import type { Codebook } from "../codebooks.types";
import { CodebookVersionService } from "../codebookVersion";

let admin: User;
let member: User;
let teamId: string;
let otherTeamId: string;

function makeContext(
  user: User = admin,
  activeTeam: string | null = teamId,
): ControllerContext {
  return { req: {} as Request, res: {} as Response, user, activeTeam };
}

async function createCodebookInTeam(team: string, createdBy: string) {
  const codebook = await CodebookService.create({
    name: "Codebook",
    description: "",
    team,
    productionVersion: 1,
    createdBy,
  });
  await CodebookVersionService.create({
    name: "initial",
    codebook: codebook._id,
    version: 1,

    categories: [] as any,
  });
  return codebook;
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
});

describe("getCodebooksByActiveTeam", () => {
  it("lists only non-deleted codebooks in the active team", async () => {
    const codebook = await createCodebookInTeam(teamId, admin._id);
    const deleted = await createCodebookInTeam(teamId, admin._id);
    await CodebookService.updateById(deleted._id, { deletedAt: new Date() });
    await createCodebookInTeam(otherTeamId, admin._id);

    const result = await getCodebooksByActiveTeam({}, makeContext());

    expect(result.count).toBe(1);
    expect(result.data.map((c) => c._id)).toEqual([codebook._id]);
    expect(result.currentPage).toBe(1);
  });

  it("throws 400 without an active team", async () => {
    await expect(
      getCodebooksByActiveTeam({}, makeContext(admin, null)),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("createCodebook", () => {
  it("creates the codebook with an initial version", async () => {
    const { data } = await createCodebook(
      { name: "New", description: "Desc" },
      makeContext(),
    );

    expect(data.team).toBe(teamId);
    expect(data.createdBy).toBe(admin._id);
    expect(data.productionVersion).toBe(1);
    const versions = await CodebookVersionService.find({
      match: { codebook: data._id },
    });
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
  });

  it("rejects non-admin team members with 403", async () => {
    await expect(
      createCodebook({ name: "New" }, makeContext(member)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("codebook scoping", () => {
  let foreignCodebook: Codebook;

  beforeEach(async () => {
    foreignCodebook = await createCodebookInTeam(otherTeamId, admin._id);
  });

  it.each([
    [
      "getCodebookById",
      () => getCodebookById({ codebookId: foreignCodebook._id }, makeContext()),
    ],
    [
      "updateCodebookById",
      () =>
        updateCodebookById(
          { codebookId: foreignCodebook._id, name: "Hacked" },
          makeContext(),
        ),
    ],
    [
      "deleteCodebookById",
      () =>
        deleteCodebookById({ codebookId: foreignCodebook._id }, makeContext()),
    ],
    [
      "getCodebookVersions",
      () =>
        getCodebookVersions({ codebookId: foreignCodebook._id }, makeContext()),
    ],
    [
      "getCodebookVersion",
      () =>
        getCodebookVersion(
          { codebookId: foreignCodebook._id, version: 1 },
          makeContext(),
        ),
    ],
    [
      "createPromptFromCodebook",
      () =>
        createPromptFromCodebook(
          {
            codebookId: foreignCodebook._id,
            codebookVersionId: new Types.ObjectId().toString(),
            annotationType: "PER_UTTERANCE",
          },
          makeContext(),
        ),
    ],
  ])("%s returns 404 for a codebook in another team", async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns 404 for an invalid id", async () => {
    await expect(
      getCodebookById({ codebookId: "not-an-id" }, makeContext()),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("updateCodebookById / deleteCodebookById", () => {
  it("lets the creator update their own codebook", async () => {
    const codebook = await createCodebookInTeam(teamId, member._id);

    const { data } = await updateCodebookById(
      { codebookId: codebook._id, name: "Renamed" },
      makeContext(member),
    );

    expect(data?.name).toBe("Renamed");
    expect(data?.description).toBe("");
  });

  it("rejects members updating someone else's codebook with 403", async () => {
    const codebook = await createCodebookInTeam(teamId, admin._id);

    await expect(
      updateCodebookById(
        { codebookId: codebook._id, name: "Renamed" },
        makeContext(member),
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("soft deletes the codebook", async () => {
    const codebook = await createCodebookInTeam(teamId, admin._id);

    const { data } = await deleteCodebookById(
      { codebookId: codebook._id },
      makeContext(),
    );

    expect(data.deleted).toBe(true);
    const stored = await CodebookService.findById(codebook._id);
    expect(stored?.deletedAt).toBeDefined();
  });
});

describe("codebook versions", () => {
  let codebook: Codebook;

  beforeEach(async () => {
    codebook = await createCodebookInTeam(teamId, admin._id);
  });

  it("lists versions newest first", async () => {
    await createNextCodebookVersion(
      { codebookId: codebook._id, version: 1 },
      makeContext(),
    );

    const { data } = await getCodebookVersions(
      { codebookId: codebook._id },
      makeContext(),
    );

    expect(data.map((v) => v.version)).toEqual([2, 1]);
  });

  it("returns 400 when the previous version does not exist", async () => {
    await expect(
      createNextCodebookVersion(
        { codebookId: codebook._id, version: 5 },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("does not read a version that belongs to another codebook", async () => {
    const other = await createCodebookInTeam(teamId, admin._id);
    await createNextCodebookVersion(
      { codebookId: other._id, version: 1 },
      makeContext(),
    );

    await expect(
      getCodebookVersion(
        { codebookId: codebook._id, version: 2 },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("updates a version and marks it saved", async () => {
    const { data } = await updateCodebookVersion(
      {
        codebookId: codebook._id,
        version: 1,
        name: "Updated",
        categories: [],
      },
      makeContext(),
    );

    expect(data?.name).toBe("Updated");
    expect(data?.hasBeenSaved).toBe(true);
  });

  it("makes an existing version production", async () => {
    await createNextCodebookVersion(
      { codebookId: codebook._id, version: 1 },
      makeContext(),
    );

    const { data } = await makeCodebookVersionProduction(
      { codebookId: codebook._id, version: 2 },
      makeContext(),
    );

    expect(data?.productionVersion).toBe(2);
  });

  it("rejects making a missing version production with 404", async () => {
    await expect(
      makeCodebookVersionProduction(
        { codebookId: codebook._id, version: 9 },
        makeContext(),
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
