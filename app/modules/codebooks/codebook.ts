import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import codebookSchema from "~/lib/schemas/codebook.schema";
import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import type { Codebook } from "./codebooks.types";
import createPromptFromCodebook from "./services/createPromptFromCodebook.server";

const CodebookModel =
  mongoose.models.Codebook || mongoose.model("Codebook", codebookSchema);

export class CodebookService {
  private static toCodebook(doc: mongoose.Document): Codebook {
    return doc.toJSON({ flattenObjectIds: true }) as Codebook;
  }

  static async find(options?: FindOptions): Promise<Codebook[]> {
    const match = options?.match || {};
    let query = CodebookModel.find(match);

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
    return docs.map((doc) => this.toCodebook(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return CodebookModel.countDocuments(match);
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
    populate,
  }: PaginateProps): Promise<{
    data: Codebook[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);
    const data = await this.find({ match, sort, pagination, select, populate });
    const count = await this.count(match);
    return { data, count, totalPages: getTotalPages(count, pageSize) };
  }

  static async findById(id: string | undefined): Promise<Codebook | null> {
    if (!id) return null;
    const doc = await CodebookModel.findById(id);
    return doc ? this.toCodebook(doc) : null;
  }

  static async findOne(
    match: Record<string, unknown>,
  ): Promise<Codebook | null> {
    const doc = await CodebookModel.findOne(match);
    return doc ? this.toCodebook(doc) : null;
  }

  static async create(data: Partial<Codebook>): Promise<Codebook> {
    const doc = await CodebookModel.create(data);
    return this.toCodebook(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<Codebook>,
  ): Promise<Codebook | null> {
    const doc = await CodebookModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toCodebook(doc) : null;
  }

  static async deleteById(id: string): Promise<Codebook | null> {
    const doc = await CodebookModel.findByIdAndDelete(id);
    return doc ? this.toCodebook(doc) : null;
  }

  static async createPromptFromCodebook(options: {
    codebookId: string;
    codebookVersionId: string;
    annotationType: AnnotationTypeOptions;
    categoryIds?: string[];
    hasFlattenedCategories?: boolean;
    flattenedAnnotationField?: string;
    userId: string;
    teamId: string;
  }) {
    return createPromptFromCodebook(options);
  }
}
