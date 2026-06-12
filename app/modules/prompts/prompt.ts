import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import promptSchema from "~/lib/schemas/prompt.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import { PromptPublishedError } from "./errors/promptPublishedError";
import { PublishError } from "./errors/publishError";
import type { Prompt, PromptAuthor, PromptPaperRef } from "./prompts.types";
import { PromptVersionService } from "./promptVersion";
import createDefaultPrompts from "./services/createDefaultPrompts.server";

const PromptModel =
  mongoose.models.Prompt || mongoose.model("Prompt", promptSchema);

export class PromptService {
  private static toPrompt(doc: mongoose.Document): Prompt {
    return doc.toJSON({ flattenObjectIds: true }) as Prompt;
  }

  static async find(options?: FindOptions): Promise<Prompt[]> {
    const match = options?.match || {};
    let query = PromptModel.find(match);

    if (options?.select) {
      query = query.select(options.select);
    }

    if (options?.populate?.length) {
      query = query.populate(options.populate);
    }

    if (options?.sort) {
      query = query.sort(options.sort);
    }

    if (options?.pagination) {
      query = query
        .skip(options.pagination.skip)
        .limit(options.pagination.limit);
    }

    const docs = await query;
    return docs.map((doc) => this.toPrompt(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return PromptModel.countDocuments(match);
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
    populate,
  }: PaginateProps): Promise<{
    data: Prompt[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);
    const data = await this.find({ match, sort, pagination, select, populate });
    const count = await this.count(match);
    return { data, count, totalPages: getTotalPages(count, pageSize) };
  }

  static async findById(id: string | undefined): Promise<Prompt | null> {
    if (!id) return null;
    const doc = await PromptModel.findById(id);
    return doc ? this.toPrompt(doc) : null;
  }

  static async findOne(match: Record<string, unknown>): Promise<Prompt | null> {
    const doc = await PromptModel.findOne(match);
    return doc ? this.toPrompt(doc) : null;
  }

  static async create(data: Partial<Prompt>): Promise<Prompt> {
    const doc = await PromptModel.create(data);
    return this.toPrompt(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<Prompt>,
  ): Promise<Prompt | null> {
    const doc = await PromptModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toPrompt(doc) : null;
  }

  static async deleteById(id: string): Promise<Prompt | null> {
    const existing = await PromptModel.findById(id);
    if (!existing) return null;
    if (existing.library?.isPublished) {
      throw new PromptPublishedError(id);
    }

    const doc = await PromptModel.findByIdAndDelete(id);
    return doc ? this.toPrompt(doc) : null;
  }

  static async softDelete(id: string): Promise<Prompt | null> {
    const existing = await PromptModel.findById(id);
    if (!existing) return null;
    if (existing.library?.isPublished) {
      throw new PromptPublishedError(id);
    }

    const doc = await PromptModel.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true },
    );
    return doc ? this.toPrompt(doc) : null;
  }

  static async findWithSavedVersions(options?: FindOptions): Promise<Prompt[]> {
    const prompts = await this.find(options);
    if (prompts.length === 0) return [];

    const promptIds = prompts.map((p) => p._id);
    const savedVersions = await PromptVersionService.find({
      match: { prompt: { $in: promptIds }, hasBeenSaved: true },
      select: ["prompt"],
    });
    const withSavedVersions = new Set(
      savedVersions.map((v) => v.prompt as string),
    );
    return prompts.filter((p) => withSavedVersions.has(p._id));
  }

  static async createDefaultPrompts(
    teamId: string,
    userId: string,
  ): Promise<void> {
    return createDefaultPrompts(teamId, userId);
  }

  static async publish(
    id: string,
    {
      description,
      authors = [],
      paperRefs,
    }: {
      description: string;
      authors?: PromptAuthor[];
      paperRefs: PromptPaperRef[];
    },
  ): Promise<Prompt | null> {
    const existing = await PromptModel.findById(id);
    if (!existing) return null;

    const productionVersion = await PromptVersionService.findOne({
      prompt: existing._id,
      version: existing.productionVersion,
    });
    if (!productionVersion?.userPrompt?.trim()) {
      throw new PublishError(
        "Add prompt content before publishing to the library.",
      );
    }

    const publishedAt = existing.library?.isPublished
      ? existing.library.publishedAt
      : new Date();

    const doc = await PromptModel.findByIdAndUpdate(
      id,
      {
        $set: {
          library: {
            isPublished: true,
            description,
            authors,
            paperRefs,
            publishedAt,
          },
        },
      },
      { new: true, runValidators: true },
    );
    return doc ? this.toPrompt(doc) : null;
  }

  static async copyFromLibrary(
    libraryPromptId: string,
    targetTeamId: string,
    userId: string,
  ): Promise<Prompt | null> {
    const source = await this.findOne({
      _id: libraryPromptId,
      "library.isPublished": true,
      deletedAt: { $exists: false },
    });
    if (!source) return null;

    const productionVersion = await PromptVersionService.findOne({
      prompt: source._id,
      version: source.productionVersion,
    });
    if (!productionVersion) return null;

    const fork = await this.create({
      name: source.name,
      team: targetTeamId,
      annotationType: source.annotationType,
      productionVersion: 1,
      createdBy: userId,
      copiedFrom: {
        prompt: source._id,
        name: source.name,
        version: source.productionVersion,
        copiedAt: new Date(),
      },
    });

    await PromptVersionService.create({
      name: "v1",
      prompt: fork._id,
      version: 1,
      userPrompt: productionVersion.userPrompt,
      annotationSchema: productionVersion.annotationSchema,
      hasBeenSaved: true,
    });

    return fork;
  }

  static async unpublish(id: string): Promise<Prompt | null> {
    const existing = await PromptModel.findById(id);
    if (!existing) return null;
    if (!existing.library) return this.toPrompt(existing);

    const doc = await PromptModel.findByIdAndUpdate(
      id,
      { $set: { "library.isPublished": false } },
      { new: true },
    );
    return doc ? this.toPrompt(doc) : null;
  }
}
