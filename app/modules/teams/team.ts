import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import teamSchema from "~/lib/schemas/team.schema";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import { UserService } from "~/modules/users/user";
import type { Team } from "./teams.types";

const TeamModel = mongoose.models.Team || mongoose.model("Team", teamSchema);

export class TeamService {
  private static toTeam(doc: mongoose.Document): Team {
    return doc.toJSON({ flattenObjectIds: true }) as Team;
  }

  static async find(options?: FindOptions): Promise<Team[]> {
    const match = options?.match || {};
    let query = TeamModel.find(match);

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

    const docs = await query.exec();
    return docs.map((doc) => this.toTeam(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return TeamModel.countDocuments(match);
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
  }: PaginateProps): Promise<{
    data: Team[];
    count: number;
    totalPages: number;
  }> {
    const pagination = getPaginationParams(page, pageSize);

    const results = await this.find({
      match,
      sort,
      pagination,
      select,
    });

    const count = await this.count(match);

    return {
      data: results,
      count,
      totalPages: getTotalPages(count, pageSize),
    };
  }

  static async findOne(match: Record<string, unknown>): Promise<Team | null> {
    const doc = await TeamModel.findOne(match);
    return doc ? this.toTeam(doc) : null;
  }

  static async findById(id: string | undefined): Promise<Team | null> {
    if (!id) return null;
    const doc = await TeamModel.findById(id);
    return doc ? this.toTeam(doc) : null;
  }

  static async create(data: Partial<Team>): Promise<Team> {
    const doc = await TeamModel.create(data);
    return this.toTeam(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<Team>,
  ): Promise<Team | null> {
    const doc = await TeamModel.findByIdAndUpdate(id, updates, {
      new: true,
    }).exec();
    return doc ? this.toTeam(doc) : null;
  }

  static async setStripeCustomerIdIfMissing(
    id: string,
    customerId: string,
  ): Promise<void> {
    await TeamModel.updateOne(
      { _id: id, stripeCustomerId: { $exists: false } },
      { $set: { stripeCustomerId: customerId } },
    );
  }

  static async deleteById(id: string): Promise<Team | null> {
    const doc = await TeamModel.findByIdAndDelete(id).exec();
    return doc ? this.toTeam(doc) : null;
  }

  static async findAllIds(): Promise<string[]> {
    const ids = await TeamModel.distinct("_id");
    return ids.map((id: mongoose.Types.ObjectId) => id.toString());
  }

  static async createForUser(
    name: string,
    userId: string,
    options: { isPersonal?: boolean } = {},
  ): Promise<Team> {
    const team = await this.create({
      name,
      createdBy: userId,
      isPersonal: options.isPersonal,
    });
    await UserService.addTeam(userId, team._id, "ADMIN");
    return team;
  }
}
