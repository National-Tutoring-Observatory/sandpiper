import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import userSchema from "~/lib/schemas/user.schema";
import { AuditService } from "~/modules/audits/audit";
import type { FindOptions, PaginateProps } from "~/modules/common/types";
import type { User } from "./users.types";

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

export class UserService {
  private static toUser(doc: mongoose.Document): User {
    return doc.toJSON({ flattenObjectIds: true }) as User;
  }

  static async find(options?: FindOptions): Promise<User[]> {
    const match = options?.match || {};
    let query = UserModel.find(match);

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
    return docs.map((doc) => this.toUser(doc));
  }

  static async count(match: Record<string, unknown> = {}): Promise<number> {
    return UserModel.countDocuments(match);
  }

  static async paginate({
    match,
    sort,
    page,
    pageSize,
    select,
  }: PaginateProps): Promise<{
    data: User[];
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

  static async findById(id: string | undefined): Promise<User | null> {
    if (!id) return null;
    const doc = await UserModel.findById(id);
    return doc ? this.toUser(doc) : null;
  }

  static async create(data: Partial<User>): Promise<User> {
    if (
      "email" in data &&
      (typeof data.email !== "string" || !data.email.trim())
    ) {
      throw new Error("Cannot create a user with an empty email");
    }
    const doc = await UserModel.create(data);
    return this.toUser(doc);
  }

  static async updateById(
    id: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    if (
      "email" in updates &&
      (typeof updates.email !== "string" || !updates.email.trim())
    ) {
      throw new Error("Cannot update a user with an empty email");
    }
    const doc = await UserModel.findByIdAndUpdate(id, updates, {
      new: true,
    });
    return doc ? this.toUser(doc) : null;
  }

  static async findOne(match: Record<string, unknown>): Promise<User | null> {
    const docs = await this.find({ match });
    return docs[0] || null;
  }

  static async deleteById(id: string): Promise<User | null> {
    const doc = await UserModel.findByIdAndDelete(id).exec();
    return doc ? this.toUser(doc) : null;
  }

  static async addTeam(
    userId: string,
    teamId: string,
    role: string,
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $push: { teams: { team: teamId, role } },
    });
  }

  static async removeTeam(userId: string, teamId: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { teams: { team: teamId } },
    });
  }

  static async addFeatureFlag(
    userId: string,
    featureFlagName: string,
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $addToSet: { featureFlags: featureFlagName },
    });
  }

  static async removeFeatureFlagFromUser(
    userId: string,
    featureFlagName: string,
  ): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $pull: { featureFlags: featureFlagName },
    });
  }

  // TODO: Move this to the feature flag service later
  static async removeFeatureFlag(featureFlagName: string): Promise<void> {
    await UserModel.updateMany(
      { featureFlags: { $in: [featureFlagName] } },
      { $pull: { featureFlags: featureFlagName } },
    );
  }

  static async assignSuperAdminRole({
    targetUser,
    performedByUser,
    reason,
  }: {
    targetUser: User;
    performedByUser: User;
    reason: string;
  }): Promise<void> {
    await this.updateById(targetUser._id, { role: "SUPER_ADMIN" });

    await AuditService.create({
      action: "ADD_SUPERADMIN",
      performedBy: performedByUser._id,
      performedByUsername: performedByUser.username,
      context: {
        target: targetUser._id,
        targetUsername: targetUser.username,
        reason,
      },
    });
  }

  static async revokeSuperAdminRole({
    targetUser,
    performedByUser,
    reason,
  }: {
    targetUser: User;
    performedByUser: User;
    reason: string;
  }): Promise<void> {
    await this.updateById(targetUser._id, { role: "USER" });

    await AuditService.create({
      action: "REMOVE_SUPERADMIN",
      performedBy: performedByUser._id,
      performedByUsername: performedByUser.username,
      context: {
        target: targetUser._id,
        targetUsername: targetUser.username,
        reason,
      },
    });
  }
}
