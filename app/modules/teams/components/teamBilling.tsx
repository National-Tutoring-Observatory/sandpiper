import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { useContext } from "react";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import BillingAuthorization from "~/modules/billing/authorization";
import type {
  BalanceSummary,
  BillingLedgerEntry,
  BillingPeriodReport,
  PendingPlanChange,
} from "~/modules/billing/billing.types";
import type {
  CostByModel,
  CostOverTime,
  SpendGranularity,
} from "~/modules/billing/billingAnalytics.types";
import UserSpend from "~/modules/billing/components/userSpend";
import type { UserCostRow } from "~/modules/billing/services/getUserCosts.server";
import type { Team } from "~/modules/teams/teams.types";
import type { User } from "~/modules/users/users.types";
import BillingOverview from "./billingOverview";
import BillingPeriodHistory from "./billingPeriodHistory";
import BillingSettings from "./billingSettings";
import CreditHistory from "./creditHistory";
import SpendAnalytics from "./spendAnalytics";

interface BillingUserInfo {
  _id: string;
  username: string;
}

interface PaginatedCredits {
  data: BillingLedgerEntry[];
  count: number;
  totalPages: number;
}

interface SpendAnalyticsData {
  byModel: Array<CostByModel & { modelName: string }>;
  bySource: Array<{ label: string; totalCost: number }>;
  overTime: CostOverTime[];
}

interface TeamBillingProps {
  balanceSummary: BalanceSummary | null;
  pendingPlanChange: PendingPlanChange | null;
  closedPeriods: BillingPeriodReport[];
  team: Team;
  credits: PaginatedCredits;
  billingUserInfo: BillingUserInfo | null;
  isSubmitting: boolean;
  isBillingEnabled: boolean;
  creditsSearchValue: string;
  creditsCurrentPage: number;
  isCreditsSyncing: boolean;
  spendAnalytics: SpendAnalyticsData;
  spendGranularity: SpendGranularity;
  onSpendGranularityChanged: (value: SpendGranularity) => void;
  onCreditsSearchValueChanged: (value: string) => void;
  onCreditsPaginationChanged: (page: number) => void;
  onAddCreditsClicked: () => void;
  onTopUpClicked: () => void;
  onAssignPlanClicked: () => void;
  onSetBillingUserClicked: () => void;
  userCosts: {
    data: UserCostRow[];
    count: number;
    totalPages: number;
  };
  userCostsCurrentPage: number;
  userCostsSortValue: string;
  isUserCostsSyncing: boolean;
  onUserCostsPaginationChanged: (page: number) => void;
  onUserCostsSortValueChanged: (sort: string) => void;
}

export default function TeamBilling({
  balanceSummary,
  pendingPlanChange,
  closedPeriods,
  team,
  credits,
  billingUserInfo,
  isSubmitting,
  isBillingEnabled,
  creditsSearchValue,
  creditsCurrentPage,
  isCreditsSyncing,
  spendAnalytics,
  spendGranularity,
  onSpendGranularityChanged,
  onCreditsSearchValueChanged,
  onCreditsPaginationChanged,
  onAddCreditsClicked,
  onTopUpClicked,
  onAssignPlanClicked,
  onSetBillingUserClicked,
  userCosts,
  userCostsCurrentPage,
  userCostsSortValue,
  isUserCostsSyncing,
  onUserCostsPaginationChanged,
  onUserCostsSortValueChanged,
}: TeamBillingProps) {
  const user = useContext(AuthenticationContext) as User | null;
  const canAssignPlan = BillingAuthorization.canAssignPlan(user);

  if (!balanceSummary) {
    return (
      <Card>
        <CardHeader className="items-center py-10">
          <CardDescription className="text-center">
            No billing plan assigned to this team.
            {canAssignPlan
              ? " Assign a billing plan to enable credits and usage tracking."
              : " A super admin must assign a billing plan before credits can be used."}
          </CardDescription>
          {canAssignPlan && (
            <Button
              className="mt-4 w-fit justify-self-center"
              onClick={onAssignPlanClicked}
            >
              Assign plan
            </Button>
          )}
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <BillingOverview
        balanceSummary={balanceSummary}
        pendingPlanChange={pendingPlanChange}
        team={team}
        isSubmitting={isSubmitting}
        isBillingEnabled={isBillingEnabled}
        onAddCreditsClicked={onAddCreditsClicked}
        onTopUpClicked={onTopUpClicked}
        onAssignPlanClicked={onAssignPlanClicked}
      />

      <SpendAnalytics
        byModel={spendAnalytics.byModel}
        bySource={spendAnalytics.bySource}
        overTime={spendAnalytics.overTime}
        granularity={spendGranularity}
        onGranularityChanged={onSpendGranularityChanged}
      />

      <UserSpend
        rows={userCosts.data}
        totalPages={userCosts.totalPages}
        currentPage={userCostsCurrentPage}
        sortValue={userCostsSortValue}
        isSyncing={isUserCostsSyncing}
        onPaginationChanged={onUserCostsPaginationChanged}
        onSortValueChanged={onUserCostsSortValueChanged}
      />

      <BillingPeriodHistory periods={closedPeriods} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CreditHistory
          credits={credits}
          searchValue={creditsSearchValue}
          currentPage={creditsCurrentPage}
          isSyncing={isCreditsSyncing}
          onSearchValueChanged={onCreditsSearchValueChanged}
          onPaginationChanged={onCreditsPaginationChanged}
        />

        <BillingSettings
          teamId={team._id}
          billingUserInfo={billingUserInfo}
          isSubmitting={isSubmitting}
          onSetBillingUserClicked={onSetBillingUserClicked}
        />
      </div>
    </div>
  );
}
