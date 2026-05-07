import mongoose from "mongoose";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import { BillingLedgerEntryModel } from "../billingLedgerEntry";
import { USER_INITIATED_SOURCE_LIST } from "../helpers/costCategories";

export interface SpendByCategory {
  userInitiated: number;
  system: number;
  totalCost: number;
}

export interface AdminSpendOverview {
  categoryTotals: SpendByCategory;
  overTime: Array<{ period: string; userInitiated: number; system: number }>;
  topTeams: Array<
    {
      teamId: string;
      teamName: string;
    } & SpendByCategory
  >;
  topUsers: Array<
    {
      userId: string;
      userName: string;
    } & SpendByCategory
  >;
}

const userInitiatedCond = {
  $in: ["$source", USER_INITIATED_SOURCE_LIST],
};

const categoryGroupFields = {
  userInitiated: {
    $sum: { $cond: [userInitiatedCond, "$amount", 0] },
  },
  system: {
    $sum: { $cond: [userInitiatedCond, 0, "$amount"] },
  },
  totalCost: { $sum: "$amount" },
};

export default async function getAdminSpendOverview(
  since: Date,
): Promise<AdminSpendOverview> {
  const matchStage = {
    direction: "debit" as const,
    createdAt: { $gte: since },
  };

  const [categoryTotalsRaw, overTimeRaw, topTeamsRaw, topUsersRaw] =
    await Promise.all([
      BillingLedgerEntryModel.aggregate<SpendByCategory>([
        { $match: matchStage },
        { $group: { _id: null, ...categoryGroupFields } },
      ]),

      BillingLedgerEntryModel.aggregate<{
        _id: string;
        userInitiated: number;
        system: number;
      }>([
        { $match: matchStage },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            userInitiated: {
              $sum: { $cond: [userInitiatedCond, "$amount", 0] },
            },
            system: {
              $sum: { $cond: [userInitiatedCond, 0, "$amount"] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      BillingLedgerEntryModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        userInitiated: number;
        system: number;
        totalCost: number;
      }>([
        { $match: matchStage },
        { $group: { _id: "$team", ...categoryGroupFields } },
        { $sort: { totalCost: -1 } },
        { $limit: 10 },
      ]),

      BillingLedgerEntryModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        userInitiated: number;
        system: number;
        totalCost: number;
      }>([
        { $match: { ...matchStage, user: { $exists: true, $ne: null } } },
        { $group: { _id: "$user", ...categoryGroupFields } },
        { $sort: { totalCost: -1 } },
        { $limit: 10 },
      ]),
    ]);

  const categoryTotals: SpendByCategory = categoryTotalsRaw[0] ?? {
    userInitiated: 0,
    system: 0,
    totalCost: 0,
  };

  const overTime = overTimeRaw.map((row) => ({
    period: row._id,
    userInitiated: row.userInitiated,
    system: row.system,
  }));

  const teamIds = topTeamsRaw.map((r) => r._id.toString());
  const userIds = topUsersRaw.map((r) => r._id.toString());

  const [teams, users] = await Promise.all([
    teamIds.length > 0
      ? TeamService.find({ match: { _id: { $in: teamIds } } })
      : Promise.resolve([]),
    userIds.length > 0
      ? UserService.find({ match: { _id: { $in: userIds } } })
      : Promise.resolve([]),
  ]);

  const teamMap = new Map(teams.map((t) => [t._id, t]));
  const userMap = new Map(users.map((u) => [u._id, u]));

  const topTeams = topTeamsRaw.map((row) => {
    const id = row._id.toString();
    const team = teamMap.get(id);
    return {
      teamId: id,
      teamName: team?.name || "Unknown",
      userInitiated: row.userInitiated,
      system: row.system,
      totalCost: row.totalCost,
    };
  });

  const topUsers = topUsersRaw.map((row) => {
    const id = row._id.toString();
    const user = userMap.get(id);
    return {
      userId: id,
      userName: user?.name || user?.username || "--",
      userInitiated: row.userInitiated,
      system: row.system,
      totalCost: row.totalCost,
    };
  });

  return { categoryTotals, overTime, topTeams, topUsers };
}
