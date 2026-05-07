import mongoose from "mongoose";
import { getPaginationParams, getTotalPages } from "~/helpers/pagination";
import type { Query } from "~/modules/app/helpers/buildQueryFromParams";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import { BillingLedgerEntryModel } from "../billingLedgerEntry";
import { USER_INITIATED_SOURCE_LIST } from "../helpers/costCategories";

export interface UserCostRow {
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  runCosts: number;
  nonRunCosts: number;
  totalBilledCosts: number;
}

interface AggregatedUserCost {
  _id: { user: mongoose.Types.ObjectId; team: mongoose.Types.ObjectId };
  runCosts: number;
  nonRunCosts: number;
  totalBilledCosts: number;
}

async function resolveRows(
  aggregated: AggregatedUserCost[],
): Promise<UserCostRow[]> {
  const userIds = [...new Set(aggregated.map((r) => r._id.user.toString()))];
  const teamIds = [...new Set(aggregated.map((r) => r._id.team.toString()))];

  const [users, teams] = await Promise.all([
    UserService.find({ match: { _id: { $in: userIds } } }),
    TeamService.find({ match: { _id: { $in: teamIds } } }),
  ]);

  const userMap = new Map(users.map((u) => [u._id, u]));
  const teamMap = new Map(teams.map((t) => [t._id, t]));

  return aggregated.map((row) => {
    const userId = row._id.user.toString();
    const teamId = row._id.team.toString();
    const user = userMap.get(userId);
    const team = teamMap.get(teamId);

    return {
      userId,
      userName: user?.name || user?.username || "--",
      teamId,
      teamName: team?.name || "Unknown",
      runCosts: row.runCosts,
      nonRunCosts: row.nonRunCosts,
      totalBilledCosts: row.totalBilledCosts,
    };
  });
}

export async function paginateUserCosts(
  teamId: string,
  query: Query,
  pageSize?: number,
): Promise<{
  data: UserCostRow[];
  count: number;
  totalPages: number;
}> {
  const teamObjectId = new mongoose.Types.ObjectId(teamId);
  const pagination = getPaginationParams(query.page, pageSize);

  const sortField =
    typeof query.sort === "string"
      ? query.sort.replace(/^-/, "")
      : "totalBilledCosts";
  const sortDirection =
    typeof query.sort === "string" && query.sort.startsWith("-") ? -1 : 1;

  const matchStage = {
    team: teamObjectId,
    direction: "debit" as const,
    user: { $exists: true, $ne: null },
  };

  const [aggregated, countResult] = await Promise.all([
    BillingLedgerEntryModel.aggregate<AggregatedUserCost>([
      { $match: matchStage },
      {
        $group: {
          _id: { user: "$user", team: "$team" },
          runCosts: {
            $sum: {
              $cond: [
                { $in: ["$source", USER_INITIATED_SOURCE_LIST] },
                "$amount",
                0,
              ],
            },
          },
          nonRunCosts: {
            $sum: {
              $cond: [
                { $in: ["$source", USER_INITIATED_SOURCE_LIST] },
                0,
                "$amount",
              ],
            },
          },
          totalBilledCosts: { $sum: "$amount" },
        },
      },
      { $sort: { [sortField]: sortDirection } },
      { $skip: pagination.skip },
      { $limit: pagination.limit },
    ]),
    BillingLedgerEntryModel.aggregate<{ count: number }>([
      { $match: matchStage },
      { $group: { _id: { user: "$user", team: "$team" } } },
      { $count: "count" },
    ]),
  ]);

  const count = countResult[0]?.count ?? 0;
  const rows = await resolveRows(aggregated);

  return {
    data: rows,
    count,
    totalPages: getTotalPages(count, pageSize),
  };
}
