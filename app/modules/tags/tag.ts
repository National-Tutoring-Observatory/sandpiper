import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import tagSchema from "~/lib/schemas/tag.schema";
import type { FindOptions, PaginateProps } from "../common/types";
import type { CreateTagProps, Tag } from "./tags.types";

export const TagModel = mongoose.models.Tag || mongoose.model("Tag", tagSchema);

export class TagService {
  private static toTag(doc: mongoose.Document): Tag {
    return doc.toJSON({ flattenObjectIds: true }) as Tag;
  }

  static async find(options?: FindOptions): Promise<Tag[]> {
    const match = options?.match || {};
    let query = TagModel.find(match);

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
    return docs.map((doc) => this.toTag(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return TagModel.countDocuments(match);
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
    populate,
  }: PaginateProps): Promise<{
    data: Tag[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);
    const data = await this.find({ match, sort, pagination, select, populate });
    const count = await this.count(match);
    return {
      data,
      count,
      totalPages: getTotalPages(count, pageSize),
    };
  }

  static async findById(id: string | undefined): Promise<Tag | null> {
    if (!id) return null;
    const doc = await TagModel.findById(id);
    return doc ? this.toTag(doc) : null;
  }

  static async create(props: CreateTagProps): Promise<Tag> {
    const doc = await TagModel.create({
      name: props.name,
      team: props.team,
      createdBy: props.createdBy,
    });
    return this.toTag(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<Tag>,
  ): Promise<Tag | null> {
    const doc = await TagModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toTag(doc) : null;
  }

  static async deleteById(id: string): Promise<Tag | null> {
    const doc = await TagModel.findByIdAndDelete(id);
    return doc ? this.toTag(doc) : null;
  }

  static async findOne(match: Record<string, unknown>): Promise<Tag | null> {
    const docs = await this.find({ match });
    return docs[0] || null;
  }
}
