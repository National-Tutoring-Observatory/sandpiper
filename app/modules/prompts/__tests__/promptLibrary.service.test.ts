import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import { PromptPublishedError } from "../errors/promptPublishedError";
import { PromptService } from "../prompt";
import { PromptVersionService } from "../promptVersion";

describe("PromptService — library subdoc persistence", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  it("persists and reloads the optional library subdoc", async () => {
    const created = await PromptService.create({
      name: "Curated prompt",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
      library: {
        isPublished: true,
        description: "Use when annotating turn-by-turn talk moves.",
        authors: [
          { name: "Jane Doe", affiliation: "Cornell University" },
          { name: "Bob Smith" },
        ],
        paperRefs: [
          { title: "Some paper", url: "https://example.com/paper" },
          { title: "Another paper", url: "https://example.com/paper-2" },
        ],
        publishedAt: new Date("2026-01-15T12:00:00Z"),
      },
    });

    const reloaded = await PromptService.findById(created._id);

    expect(reloaded).not.toBeNull();
    expect(reloaded!.library).toBeDefined();
    expect(reloaded!.library!.isPublished).toBe(true);
    expect(reloaded!.library!.description).toBe(
      "Use when annotating turn-by-turn talk moves.",
    );
    expect(reloaded!.library!.paperRefs).toEqual([
      { title: "Some paper", url: "https://example.com/paper" },
      { title: "Another paper", url: "https://example.com/paper-2" },
    ]);
    expect(new Date(reloaded!.library!.publishedAt!).toISOString()).toBe(
      "2026-01-15T12:00:00.000Z",
    );
  });

  it("creates prompts without a library subdoc by default", async () => {
    const created = await PromptService.create({
      name: "Regular prompt",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const reloaded = await PromptService.findById(created._id);
    expect(reloaded!.library).toBeUndefined();
  });
});

describe("PromptService.publish", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  it("sets isPublished=true, stamps publishedAt, stores intention and paperRefs", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const before = Date.now();
    const published = await PromptService.publish(prompt._id, {
      description: "Use during turn-by-turn coding of talk moves.",
      paperRefs: [
        { title: "Paper A", url: "https://example.com/a" },
        { title: "Paper B", url: "https://example.com/b" },
      ],
    });
    const after = Date.now();

    expect(published).not.toBeNull();
    expect(published!.library!.isPublished).toBe(true);
    expect(published!.library!.description).toBe(
      "Use during turn-by-turn coding of talk moves.",
    );
    expect(published!.library!.paperRefs).toEqual([
      { title: "Paper A", url: "https://example.com/a" },
      { title: "Paper B", url: "https://example.com/b" },
    ]);

    const publishedAt = new Date(published!.library!.publishedAt!).getTime();
    expect(publishedAt).toBeGreaterThanOrEqual(before);
    expect(publishedAt).toBeLessThanOrEqual(after);
  });

  it("updates an existing library subdoc when re-publishing", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
      library: {
        isPublished: false,
        description: "Old description",
        authors: [],
        paperRefs: [{ title: "Old", url: "https://example.com/old" }],
        publishedAt: new Date("2026-01-01T00:00:00Z"),
      },
    });

    const republished = await PromptService.publish(prompt._id, {
      description: "New intention",
      paperRefs: [{ title: "New", url: "https://example.com/new" }],
    });

    expect(republished!.library!.isPublished).toBe(true);
    expect(republished!.library!.description).toBe("New intention");
    expect(republished!.library!.paperRefs).toEqual([
      { title: "New", url: "https://example.com/new" },
    ]);
  });

  it("preserves the original publishedAt when editing a still-published prompt", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const first = await PromptService.publish(prompt._id, {
      description: "first",
      paperRefs: [],
    });
    const firstPublishedAt = new Date(first!.library!.publishedAt!).getTime();

    await new Promise((r) => setTimeout(r, 20));

    const second = await PromptService.publish(prompt._id, {
      description: "second",
      paperRefs: [{ title: "p", url: "https://example.com" }],
    });
    expect(new Date(second!.library!.publishedAt!).getTime()).toBe(
      firstPublishedAt,
    );
    expect(second!.library!.description).toBe("second");
  });

  it("re-stamps publishedAt when re-publishing after unpublish", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const first = await PromptService.publish(prompt._id, {
      description: "first",
      paperRefs: [],
    });
    const firstPublishedAt = new Date(first!.library!.publishedAt!).getTime();
    await PromptService.unpublish(prompt._id);

    await new Promise((r) => setTimeout(r, 20));

    const second = await PromptService.publish(prompt._id, {
      description: "second",
      paperRefs: [],
    });
    expect(new Date(second!.library!.publishedAt!).getTime()).toBeGreaterThan(
      firstPublishedAt,
    );
  });

  it("rejects paperRefs missing required fields", async () => {
    const prompt = await PromptService.create({
      name: "Bad refs",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await expect(
      PromptService.publish(prompt._id, {
        description: "x",
        paperRefs: [{ title: "no url" } as any],
      }),
    ).rejects.toThrow();
  });

  it("stores authors with optional affiliation", async () => {
    const prompt = await PromptService.create({
      name: "Attributed",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const published = await PromptService.publish(prompt._id, {
      description: "x",
      authors: [
        { name: "Jane Doe", affiliation: "Cornell University" },
        { name: "Solo Researcher" },
      ],
      paperRefs: [],
    });

    expect(published!.library!.authors).toEqual([
      { name: "Jane Doe", affiliation: "Cornell University" },
      { name: "Solo Researcher" },
    ]);
  });

  it("rejects authors missing a name", async () => {
    const prompt = await PromptService.create({
      name: "Bad attribution",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await expect(
      PromptService.publish(prompt._id, {
        description: "x",
        authors: [{ affiliation: "MIT" } as any],
        paperRefs: [],
      }),
    ).rejects.toThrow();
  });

  it("defaults authors to an empty array when not provided", async () => {
    const prompt = await PromptService.create({
      name: "No attribution",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const published = await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });
    expect(published!.library!.authors).toEqual([]);
  });

  it("returns null when the prompt does not exist", async () => {
    const result = await PromptService.publish("000000000000000000000000", {
      description: "x",
      paperRefs: [],
    });
    expect(result).toBeNull();
  });
});

describe("PromptService.unpublish", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  it("sets isPublished=false while preserving intention and paperRefs", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "Important context",
      paperRefs: [{ title: "Paper", url: "https://example.com/p" }],
    });

    const unpublished = await PromptService.unpublish(prompt._id);

    expect(unpublished).not.toBeNull();
    expect(unpublished!.library).toBeDefined();
    expect(unpublished!.library!.isPublished).toBe(false);
    expect(unpublished!.library!.description).toBe("Important context");
    expect(unpublished!.library!.paperRefs).toEqual([
      { title: "Paper", url: "https://example.com/p" },
    ]);
  });

  it("is a no-op when the prompt has no library subdoc", async () => {
    const prompt = await PromptService.create({
      name: "Plain",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const result = await PromptService.unpublish(prompt._id);
    expect(result).not.toBeNull();
    expect(result!.library).toBeUndefined();
  });

  it("returns null when the prompt does not exist", async () => {
    const result = await PromptService.unpublish("000000000000000000000000");
    expect(result).toBeNull();
  });
});

describe("PromptService.copyFromLibrary", () => {
  let sourceTeamId: string;
  let sourceUserId: string;
  let targetTeamId: string;
  let targetUserId: string;

  beforeEach(async () => {
    await clearDocumentDB();

    const sourceTeam = await TeamService.create({ name: "curator team" });
    sourceTeamId = sourceTeam._id;
    const sourceUser = await UserService.create({
      username: "curator",
      teams: [{ team: sourceTeamId, role: "ADMIN" }],
    });
    sourceUserId = sourceUser._id;

    const targetTeam = await TeamService.create({ name: "consumer team" });
    targetTeamId = targetTeam._id;
    const targetUser = await UserService.create({
      username: "consumer",
      teams: [{ team: targetTeamId, role: "MEMBER" }],
    });
    targetUserId = targetUser._id;
  });

  const seedLibraryPrompt = async () => {
    const source = await PromptService.create({
      name: "Talk Moves (curated)",
      team: sourceTeamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 2,
      createdBy: sourceUserId,
    });

    await PromptVersionService.create({
      name: "draft",
      prompt: source._id,
      version: 1,
      userPrompt: "first draft prompt",
      annotationSchema: [],
      hasBeenSaved: false,
    });

    const productionVersion = await PromptVersionService.create({
      name: "production",
      prompt: source._id,
      version: 2,
      userPrompt: "production user prompt",
      annotationSchema: [
        { fieldKey: "_id", value: "", isSystem: true },
        { fieldKey: "moveType", value: "", isSystem: false, codes: ["A", "B"] },
      ],
      hasBeenSaved: true,
    });

    await PromptService.publish(source._id, {
      description: "Annotate talk moves utterance-by-utterance.",
      paperRefs: [{ title: "Paper", url: "https://example.com/paper" }],
    });

    return { source, productionVersion };
  };

  it("creates a fresh prompt in the target team without a library subdoc", async () => {
    const { source } = await seedLibraryPrompt();

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );

    expect(fork).not.toBeNull();
    expect(fork!._id).not.toBe(source._id);
    expect(fork!.team).toBe(targetTeamId);
    expect(fork!.createdBy).toBe(targetUserId);
    expect(fork!.annotationType).toBe("PER_UTTERANCE");
    expect(fork!.library).toBeUndefined();
    expect(fork!.productionVersion).toBe(1);
  });

  it("copies the source's production prompt version as v1 of the fork", async () => {
    const { source, productionVersion } = await seedLibraryPrompt();

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );

    const forkVersions = await PromptVersionService.find({
      match: { prompt: fork!._id },
    });

    expect(forkVersions).toHaveLength(1);
    const [forkVersion] = forkVersions;
    expect(forkVersion.version).toBe(1);
    expect(forkVersion.hasBeenSaved).toBe(true);
    expect(forkVersion.userPrompt).toBe(productionVersion.userPrompt);
    expect(forkVersion.annotationSchema).toEqual(
      productionVersion.annotationSchema,
    );
  });

  it("does not carry codebook references from the source version", async () => {
    const source = await PromptService.create({
      name: "Linked",
      team: sourceTeamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: sourceUserId,
    });

    await PromptVersionService.create({
      name: "production",
      prompt: source._id,
      version: 1,
      userPrompt: "...",
      annotationSchema: [],
      hasBeenSaved: true,
      codebook: "507f1f77bcf86cd799439011",
      codebookVersion: "507f1f77bcf86cd799439012",
    } as any);

    await PromptService.publish(source._id, {
      description: "x",
      paperRefs: [],
    });

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );

    const [forkVersion] = await PromptVersionService.find({
      match: { prompt: fork!._id },
    });
    expect(forkVersion.codebook).toBeUndefined();
    expect(forkVersion.codebookVersion).toBeUndefined();
  });

  it("produces a fork independent of the source (mutations do not leak either way)", async () => {
    const { source } = await seedLibraryPrompt();

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );

    await PromptService.updateById(fork!._id, { name: "Forked name" });

    const reloadedSource = await PromptService.findById(source._id);
    expect(reloadedSource!.name).toBe("Talk Moves (curated)");
    expect(reloadedSource!.library!.isPublished).toBe(true);

    await PromptService.updateById(source._id, {
      name: "Renamed curated",
    });

    const reloadedFork = await PromptService.findById(fork!._id);
    expect(reloadedFork!.name).toBe("Forked name");
  });

  it("returns null when the source prompt does not exist", async () => {
    const fork = await PromptService.copyFromLibrary(
      "000000000000000000000000",
      targetTeamId,
      targetUserId,
    );
    expect(fork).toBeNull();
  });

  it("returns null when the source has been soft-deleted (even if still marked published)", async () => {
    const source = await PromptService.create({
      name: "Soft deleted",
      team: sourceTeamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: sourceUserId,
    });
    await PromptVersionService.create({
      name: "v1",
      prompt: source._id,
      version: 1,
      userPrompt: "x",
      annotationSchema: [],
      hasBeenSaved: true,
    });
    await PromptService.publish(source._id, {
      description: "x",
      paperRefs: [],
    });
    await PromptService.updateById(source._id, { deletedAt: new Date() });

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );
    expect(fork).toBeNull();
  });

  it("returns null when the source has no published library entry", async () => {
    const source = await PromptService.create({
      name: "Unpublished",
      team: sourceTeamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: sourceUserId,
    });
    await PromptVersionService.create({
      name: "v1",
      prompt: source._id,
      version: 1,
      userPrompt: "x",
      annotationSchema: [],
      hasBeenSaved: true,
    });

    const fork = await PromptService.copyFromLibrary(
      source._id,
      targetTeamId,
      targetUserId,
    );
    expect(fork).toBeNull();
  });
});

describe("PromptService.listLibrary", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  const seedPrompts = async () => {
    const published1 = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(published1._id, {
      description: "talk moves intention",
      paperRefs: [],
    });

    const published2 = await PromptService.create({
      name: "Session Quality",
      team: teamId,
      annotationType: "PER_SESSION",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(published2._id, {
      description: "session quality intention",
      authors: [{ name: "Alice Researcher", affiliation: "Stanford" }],
      paperRefs: [],
    });

    const unpublished = await PromptService.create({
      name: "Draft prompt",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const formerlyPublished = await PromptService.create({
      name: "Retired prompt",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(formerlyPublished._id, {
      description: "retired",
      paperRefs: [],
    });
    await PromptService.unpublish(formerlyPublished._id);

    return { published1, published2, unpublished, formerlyPublished };
  };

  it("returns only published prompts, excluding unpublished and never-published", async () => {
    const { published1, published2, unpublished, formerlyPublished } =
      await seedPrompts();

    const { data, count } = await PromptService.listLibrary({});

    const ids = data.map((p) => p._id).sort();
    expect(ids).toEqual([published1._id, published2._id].sort());
    expect(count).toBe(2);
    expect(ids).not.toContain(unpublished._id);
    expect(ids).not.toContain(formerlyPublished._id);
  });

  it("excludes soft-deleted prompts even if still marked published", async () => {
    const prompt = await PromptService.create({
      name: "Soft deleted",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });
    await PromptService.updateById(prompt._id, { deletedAt: new Date() });

    const { data, count } = await PromptService.listLibrary({});
    expect(data.map((p) => p._id)).not.toContain(prompt._id);
    expect(count).toBe(0);
  });

  it("filters by annotationType", async () => {
    await seedPrompts();

    const { data } = await PromptService.listLibrary({
      annotationType: "PER_SESSION",
    });

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Session Quality");
  });

  it("matches search against name", async () => {
    await seedPrompts();

    const { data } = await PromptService.listLibrary({ search: "talk" });

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Talk Moves");
  });

  it("matches search against description", async () => {
    await seedPrompts();

    const { data } = await PromptService.listLibrary({
      search: "session quality intention",
    });

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Session Quality");
  });

  it("matches search against author name", async () => {
    await seedPrompts();

    const { data } = await PromptService.listLibrary({ search: "Alice" });

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Session Quality");
  });

  it("matches search against author affiliation", async () => {
    await seedPrompts();

    const { data } = await PromptService.listLibrary({ search: "Stanford" });

    expect(data).toHaveLength(1);
    expect(data[0].name).toBe("Session Quality");
  });

  it("paginates", async () => {
    for (let i = 0; i < 5; i++) {
      const p = await PromptService.create({
        name: `Prompt ${i}`,
        team: teamId,
        annotationType: "PER_UTTERANCE",
        productionVersion: 1,
        createdBy: userId,
      });
      await PromptService.publish(p._id, {
        description: `i${i}`,
        paperRefs: [],
      });
    }

    const page1 = await PromptService.listLibrary({ page: 1, pageSize: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.count).toBe(5);
    expect(page1.totalPages).toBe(3);

    const page3 = await PromptService.listLibrary({ page: 3, pageSize: 2 });
    expect(page3.data).toHaveLength(1);
  });

  it("sorts by -publishedAt (newest first) by default", async () => {
    const a = await PromptService.create({
      name: "A",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const b = await PromptService.create({
      name: "B",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    const c = await PromptService.create({
      name: "C",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    await PromptService.publish(a._id, { description: "a", paperRefs: [] });
    await new Promise((r) => setTimeout(r, 10));
    await PromptService.publish(b._id, { description: "b", paperRefs: [] });
    await new Promise((r) => setTimeout(r, 10));
    await PromptService.publish(c._id, { description: "c", paperRefs: [] });

    const { data } = await PromptService.listLibrary({});
    expect(data.map((p) => p.name)).toEqual(["C", "B", "A"]);
  });
});

describe("PromptService.softDelete", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  it("sets deletedAt on a never-published prompt", async () => {
    const prompt = await PromptService.create({
      name: "Plain",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const result = await PromptService.softDelete(prompt._id);
    expect(result).not.toBeNull();
    expect(result!.deletedAt).toBeInstanceOf(Date);
  });

  it("throws PromptPublishedError when the prompt is published", async () => {
    const prompt = await PromptService.create({
      name: "Published",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });

    await expect(PromptService.softDelete(prompt._id)).rejects.toBeInstanceOf(
      PromptPublishedError,
    );

    const reloaded = await PromptService.findById(prompt._id);
    expect(reloaded!.deletedAt).toBeUndefined();
  });

  it("allows deletion when a prompt has been unpublished", async () => {
    const prompt = await PromptService.create({
      name: "Was published",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });
    await PromptService.unpublish(prompt._id);

    const result = await PromptService.softDelete(prompt._id);
    expect(result!.deletedAt).toBeInstanceOf(Date);
  });

  it("returns null when the prompt does not exist", async () => {
    const result = await PromptService.softDelete("000000000000000000000000");
    expect(result).toBeNull();
  });
});

describe("PromptService.deleteById guard for published prompts", () => {
  let teamId: string;
  let userId: string;

  beforeEach(async () => {
    await clearDocumentDB();
    const team = await TeamService.create({ name: "curator team" });
    teamId = team._id;
    const user = await UserService.create({
      username: "curator",
      teams: [{ team: teamId, role: "ADMIN" }],
    });
    userId = user._id;
  });

  it("throws PromptPublishedError when deleting a published prompt", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });

    await expect(PromptService.deleteById(prompt._id)).rejects.toBeInstanceOf(
      PromptPublishedError,
    );

    const stillThere = await PromptService.findById(prompt._id);
    expect(stillThere).not.toBeNull();
  });

  it("allows deletion when the prompt has been unpublished", async () => {
    const prompt = await PromptService.create({
      name: "Talk Moves",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });
    await PromptService.publish(prompt._id, {
      description: "x",
      paperRefs: [],
    });
    await PromptService.unpublish(prompt._id);

    const deleted = await PromptService.deleteById(prompt._id);
    expect(deleted).not.toBeNull();

    const reloaded = await PromptService.findById(prompt._id);
    expect(reloaded).toBeNull();
  });

  it("allows deletion when the prompt has never been published", async () => {
    const prompt = await PromptService.create({
      name: "Plain",
      team: teamId,
      annotationType: "PER_UTTERANCE",
      productionVersion: 1,
      createdBy: userId,
    });

    const deleted = await PromptService.deleteById(prompt._id);
    expect(deleted).not.toBeNull();
  });
});
