import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import sessionSchema from "~/lib/schemas/session.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
// Registers the Tag model so `.populate(["tags"])` can resolve the ref.
import "~/modules/tags/tag";
import type { Session } from "./sessions.types";

const SessionModel =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);

export class SessionService {
  private static toSession(doc: mongoose.Document): Session {
    return doc.toJSON({ flattenObjectIds: true }) as Session;
  }

  static async find(options?: FindOptions): Promise<Session[]> {
    const match = options?.match || {};
    let query = SessionModel.find(match);

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
    return docs.map((doc) => this.toSession(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return SessionModel.countDocuments(match);
  }

  static async findById(id: string | undefined): Promise<Session | null> {
    if (!id) return null;
    const doc = await SessionModel.findById(id);
    return doc ? this.toSession(doc) : null;
  }

  static async findOne(
    match: Record<string, unknown>,
  ): Promise<Session | null> {
    const doc = await SessionModel.findOne(match);
    return doc ? this.toSession(doc) : null;
  }

  static async create(data: Partial<Session>): Promise<Session> {
    const doc = await SessionModel.create(data);
    return this.toSession(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<Session>,
  ): Promise<Session | null> {
    const doc = await SessionModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toSession(doc) : null;
  }

  static async updateMany({
    ids,
    updates,
    match = {},
  }: {
    ids: string[];
    updates: Partial<Session>;
    match?: Record<string, unknown>;
  }): Promise<number> {
    const result = await SessionModel.updateMany(
      { _id: { $in: ids }, ...match },
      { $set: updates },
    );
    return result.modifiedCount || 0;
  }

  static async deleteById(id: string): Promise<Session | null> {
    const doc = await SessionModel.findByIdAndDelete(id);
    return doc ? this.toSession(doc) : null;
  }

  static async findByProject(projectId: string): Promise<Session[]> {
    return this.find({ match: { project: projectId } });
  }

  static async deleteByProject(projectId: string): Promise<number> {
    const result = await SessionModel.deleteMany({ project: projectId });
    return result.deletedCount || 0;
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
  }: PaginateProps): Promise<{
    data: Session[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);

    const results = await this.find({
      match,
      sort,
      pagination,
      select,
      populate: ["tags"],
    });

    const count = await this.count(match);

    return {
      data: results,
      count,
      totalPages: getTotalPages(count, pageSize),
    };
  }
}
