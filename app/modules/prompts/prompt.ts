import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import promptSchema from "~/lib/schemas/prompt.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import type { Prompt } from "./prompts.types";
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
    const doc = await PromptModel.findByIdAndDelete(id);
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
}
