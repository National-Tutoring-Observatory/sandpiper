import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, Clock, Plus } from "lucide-react";
import { useContext } from "react";
import getMonthYearString from "~/modules/app/helpers/getMonthYearString";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import BillingAuthorization from "~/modules/billing/authorization";
import type {
  BalanceSummary,
  PendingPlanChange,
} from "~/modules/billing/billing.types";
import type { Team } from "~/modules/teams/teams.types";
import type { User } from "~/modules/users/users.types";

interface BillingOverviewProps {
  balanceSummary: BalanceSummary;
  pendingPlanChange: PendingPlanChange | null;
  team: Team;
  isSubmitting: boolean;
  isBillingEnabled: boolean;
  onAddCreditsClicked: () => void;
  onTopUpClicked: () => void;
  onAssignPlanClicked: () => void;
}

export default function BillingOverview({
  balanceSummary,
  pendingPlanChange,
  team,
  isSubmitting,
  isBillingEnabled,
  onAddCreditsClicked,
  onTopUpClicked,
  onAssignPlanClicked,
}: BillingOverviewProps) {
  const user = useContext(AuthenticationContext) as User | null;
  const canAddCredits = BillingAuthorization.canAddCredits(user);
  const canTopUp = BillingAuthorization.canTopUp(user, team);
  const canAssignPlan = BillingAuthorization.canAssignPlan(user);
  const isLowBalance = balanceSummary.balance < 1 && balanceSummary.balance > 0;
  const isNegativeBalance = balanceSummary.balance < 0;

  return (
    <>
      {isNegativeBalance && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Insufficient credits</AlertTitle>
          <AlertDescription>
            Your team has no remaining credits. LLM calls will be blocked until
            credits are added.
          </AlertDescription>
        </Alert>
      )}

      {isLowBalance && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Low balance</AlertTitle>
          <AlertDescription>
            Your team balance is below $1. Add credits to avoid service
            interruption.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Balance</CardDescription>
            <CardTitle
              className={`text-display ${isNegativeBalance ? "text-destructive" : isLowBalance ? "text-yellow-600" : ""}`}
            >
              ${balanceSummary.balance.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Credits Added</CardDescription>
            <CardTitle className="text-display">
              ${balanceSummary.credits.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Usage</CardDescription>
            <CardTitle className="text-display">
              ${balanceSummary.markedUpCosts.toFixed(2)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Plan</CardDescription>
            <CardTitle className="text-display">
              {balanceSummary.plan.name}
            </CardTitle>
            {canAssignPlan && balanceSummary.plan.markupRate != null && (
              <CardDescription>
                {((balanceSummary.plan.markupRate - 1) * 100).toFixed(0)}%
                markup
              </CardDescription>
            )}
            {pendingPlanChange && (
              <CardDescription className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-3 w-3" />
                Changing to {pendingPlanChange.plan.name} on{" "}
                {getMonthYearString(pendingPlanChange.effectiveFrom)}
              </CardDescription>
            )}
            {canAssignPlan && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAssignPlanClicked}
                disabled={isSubmitting}
              >
                Change
              </Button>
            )}
          </CardHeader>
        </Card>
      </div>

      {(canAddCredits || canTopUp) && (
        <div className="flex gap-2">
          {isBillingEnabled && canTopUp && (
            <Button onClick={onTopUpClicked} disabled={isSubmitting}>
              <Plus className="mr-1 h-4 w-4" />
              Top up
            </Button>
          )}
          {canAddCredits && (
            <Button
              variant="outline"
              onClick={onAddCreditsClicked}
              disabled={isSubmitting}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add credits
            </Button>
          )}
        </div>
      )}
    </>
  );
}
