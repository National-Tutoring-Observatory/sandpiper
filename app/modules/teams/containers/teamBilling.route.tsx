import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useRevalidator,
  useSearchParams,
} from "react-router";

import { toast } from "sonner";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import BillingAuthorization from "~/modules/billing/authorization";
import type { SpendGranularity } from "~/modules/billing/billingAnalytics.types";
import { BillingLedgerEntryService } from "~/modules/billing/billingLedgerEntry";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import AddCreditsDialog from "~/modules/billing/components/addCreditsDialog";
import AssignBillingPlanDialog from "~/modules/billing/components/assignBillingPlanDialog";
import TopUpDialog from "~/modules/billing/components/topUpDialog";
import SetBillingUserDialogContainer from "~/modules/billing/containers/setBillingUserDialog.container";
import isBillingEnabled from "~/modules/billing/helpers/isBillingEnabled.server";
import { groupCostsBySource } from "~/modules/billing/helpers/sourceLabels";
import addCredits from "~/modules/billing/services/addCredits.server";
import getBillingReportingSummary from "~/modules/billing/services/getBillingReportingSummary.server";
import getBillingSpendAnalytics from "~/modules/billing/services/getBillingSpendAnalytics.server";
import { StripeService } from "~/modules/billing/stripe";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { TeamBillingPlanService } from "~/modules/billing/teamBillingPlan";
import addDialog, { closeDialog } from "~/modules/dialogs/addDialog";
import { findModelByCode } from "~/modules/llm/modelRegistry";
import { UserService } from "~/modules/users/user";
import TeamAuthorization from "../authorization";
import TeamBilling from "../components/teamBilling";
import { TeamService } from "../team";
import type { Route } from "./+types/teamBilling.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  if (!TeamAuthorization.canView(user, params.teamId)) {
    return redirect("/");
  }

  const team = await TeamService.findById(params.teamId);
  if (!team) return redirect("/teams");

  if (!BillingAuthorization.canViewBilling(user, team, isBillingEnabled())) {
    return redirect(`/teams/${params.teamId}/users`);
  }

  const creditsQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "-createdAt",
      filters: {},
    },
    { paramPrefix: "credits" },
  );

  const creditsQuery = buildQueryFromParams({
    match: { team: params.teamId },
    queryParams: creditsQueryParams,
    searchableFields: ["metadata.note"],
    sortableFields: ["createdAt", "amount"],
  });

  const userCostsQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "-totalBilledCosts",
      filters: {},
    },
    { paramPrefix: "userCosts" },
  );

  const userCostsQuery = buildQueryFromParams({
    match: {},
    queryParams: userCostsQueryParams,
    searchableFields: [],
    sortableFields: ["totalBilledCosts", "runCosts", "nonRunCosts"],
  });

  const canAssignPlan = BillingAuthorization.canAssignPlan(user);

  const [
    billingReportingSummary,
    credits,
    billingUserInfo,
    billingPlans,
    pendingPlanChange,
    userCosts,
  ] = await Promise.all([
    getBillingReportingSummary(params.teamId),
    BillingLedgerEntryService.paginate({
      match: {
        ...creditsQuery.match,
        direction: "credit",
      },
      sort: creditsQuery.sort,
      page: creditsQuery.page,
      pageSize: 20,
    }),
    team.billingUser
      ? UserService.findById(team.billingUser).then((u) =>
          u ? { _id: u._id, username: u.username } : null,
        )
      : Promise.resolve(null),
    canAssignPlan ? BillingPlanService.find() : Promise.resolve([]),
    TeamBillingPlanService.getPendingPlanChange(params.teamId),
    TeamBillingService.paginateUserCosts(params.teamId, userCostsQuery),
  ]);

  const { balanceSummary, closedPeriods } = billingReportingSummary;

  const emptySpendAnalytics = {
    byModel: [],
    bySource: [],
    overTime: [],
  };

  const billingEnabled = isBillingEnabled();

  if (!balanceSummary) {
    return {
      team,
      balanceSummary,
      credits,
      billingUserInfo,
      billingPlans,
      pendingPlanChange,
      closedPeriods,
      spendAnalytics: emptySpendAnalytics,
      isBillingEnabled: billingEnabled,
      userCosts,
    };
  }

  if (!canAssignPlan) {
    delete balanceSummary.plan.markupRate;
    delete balanceSummary.costs;
    for (const period of closedPeriods) {
      delete period.rawCost;
    }
  }

  const url = new URL(request.url);
  const validGranularities: SpendGranularity[] = ["day", "week", "month"];
  const rawGranularity = url.searchParams.get("spendGranularity");
  const spendGranularity: SpendGranularity = validGranularities.includes(
    rawGranularity as SpendGranularity,
  )
    ? (rawGranularity as SpendGranularity)
    : "month";

  const {
    byModel: rawCostsByModel,
    bySource: costsBySource,
    overTime: costsOverTime,
  } = await getBillingSpendAnalytics(params.teamId, spendGranularity);

  const costsByModel = rawCostsByModel.map((c) => ({
    ...c,
    modelName:
      findModelByCode(c.model, { includeDeprecated: true })?.name ?? c.model,
  }));

  const spendAnalytics = {
    byModel: costsByModel,
    bySource: groupCostsBySource(costsBySource),
    overTime: costsOverTime,
  };

  return {
    team,
    balanceSummary,
    credits,
    billingUserInfo,
    billingPlans,
    pendingPlanChange,
    closedPeriods,
    spendAnalytics,
    isBillingEnabled: billingEnabled,
    userCosts,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const { intent, payload = {} } = await request.json();

  const team = await TeamService.findById(params.teamId);
  if (!team) throw new Error("Team not found");

  switch (intent) {
    case "ADD_CREDITS": {
      if (!BillingAuthorization.canAddCredits(user)) {
        return data(
          { errors: { general: "You do not have permission to add credits" } },
          { status: 403 },
        );
      }
      if (
        typeof payload.amount !== "number" ||
        !Number.isFinite(payload.amount)
      ) {
        return data({ errors: { general: "Invalid amount" } }, { status: 400 });
      }
      if (!Number.isInteger(payload.amount)) {
        return data(
          { errors: { general: "Amount must be a whole dollar value" } },
          { status: 400 },
        );
      }
      const note =
        typeof payload.note === "string" && payload.note.trim()
          ? payload.note.trim()
          : "Added by System Admin";
      if (
        typeof payload.idempotencyKey !== "string" ||
        !payload.idempotencyKey.trim()
      ) {
        return data(
          { errors: { general: "Missing credit request key" } },
          { status: 400 },
        );
      }
      const result = await addCredits({
        teamId: params.teamId,
        amount: payload.amount,
        addedBy: user._id,
        note,
        idempotencyKey: payload.idempotencyKey,
      });
      if (!result.success) {
        return data({ errors: { general: result.error } }, { status: 400 });
      }
      return data({ success: true, intent: "ADD_CREDITS" });
    }

    case "SET_BILLING_USER": {
      if (!BillingAuthorization.canSetBillingUser(user, params.teamId)) {
        return data(
          {
            errors: {
              general: "You do not have permission to set the billing user",
            },
          },
          { status: 403 },
        );
      }
      if (typeof payload.userId !== "string" || !payload.userId) {
        return data(
          { errors: { general: "Invalid user ID" } },
          { status: 400 },
        );
      }
      const isMember = await UserService.findOne({
        _id: payload.userId,
        "teams.team": params.teamId,
      });
      if (!isMember) {
        return data(
          { errors: { general: "User is not a member of this team" } },
          { status: 400 },
        );
      }
      await TeamService.updateById(params.teamId, {
        billingUser: isMember._id,
      });
      return data({ success: true, intent: "SET_BILLING_USER" });
    }

    case "ASSIGN_PLAN": {
      if (!BillingAuthorization.canAssignPlan(user)) {
        return data(
          { errors: { general: "Only super admins can assign billing plans" } },
          { status: 403 },
        );
      }
      if (!payload.planId) {
        return data(
          { errors: { general: "Plan ID is required" } },
          { status: 400 },
        );
      }
      const plan = await BillingPlanService.findById(payload.planId);
      if (!plan) {
        return data(
          { errors: { general: "Billing plan not found" } },
          { status: 404 },
        );
      }
      await TeamBillingPlanService.assignPlan(params.teamId, plan._id);
      return data({ success: true, intent: "ASSIGN_PLAN" });
    }

    case "INITIATE_TOPUP": {
      if (!BillingAuthorization.canTopUp(user, team)) {
        return data(
          {
            errors: {
              general: "You do not have permission to top up credits",
            },
          },
          { status: 403 },
        );
      }
      if (!isBillingEnabled()) {
        return data(
          { errors: { general: "Billing is not enabled" } },
          { status: 400 },
        );
      }
      const amount = payload.amount;
      if (!Number.isInteger(amount) || amount < 1 || amount > 10000) {
        return data({ errors: { general: "Invalid amount" } }, { status: 400 });
      }
      let session;
      try {
        const customerId = await StripeService.ensureCustomer(team);
        const baseUrl = new URL(request.url).origin;
        session = await StripeService.createCheckoutSession({
          customerId,
          amount,
          successUrl: `${baseUrl}/teams/${params.teamId}/billing?topup=success`,
          cancelUrl: `${baseUrl}/teams/${params.teamId}/billing`,
          metadata: { teamId: params.teamId, userId: user._id.toString() },
        });
      } catch {
        return data(
          { errors: { general: "Failed to initiate checkout" } },
          { status: 500 },
        );
      }
      if (!session.url) {
        return data(
          { errors: { general: "Failed to create checkout session" } },
          { status: 500 },
        );
      }
      return data({
        success: true,
        intent: "INITIATE_TOPUP",
        checkoutUrl: session.url,
      });
    }

    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

const successMessages: Record<string, string> = {
  ADD_CREDITS: "Credits added",
  SET_BILLING_USER: "Billing user updated",
  ASSIGN_PLAN: "Billing plan assigned",
};

export default function TeamBillingRoute() {
  const {
    team,
    balanceSummary,
    credits,
    billingUserInfo,
    billingPlans,
    pendingPlanChange,
    closedPeriods,
    spendAnalytics,
    isBillingEnabled: billingEnabled,
    userCosts,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const { revalidate } = useRevalidator();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    searchValue: creditsSearchValue,
    setSearchValue: setCreditsSearchValue,
    currentPage: creditsCurrentPage,
    setCurrentPage: setCreditsCurrentPage,
    isSyncing: isCreditsSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "-createdAt",
      filters: {},
    },
    { paramPrefix: "credits" },
  );

  const {
    currentPage: userCostsCurrentPage,
    setCurrentPage: setUserCostsCurrentPage,
    sortValue: userCostsSortValue,
    setSortValue: setUserCostsSortValue,
    isSyncing: isUserCostsSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "-totalBilledCosts",
      filters: {},
    },
    { paramPrefix: "userCosts" },
  );

  const spendGranularity = (searchParams.get("spendGranularity") ??
    "month") as SpendGranularity;
  const setSpendGranularity = (value: SpendGranularity) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev.toString());
        next.set("spendGranularity", value);
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if (searchParams.get("topup") !== "success") return;
    toast.success("Credits purchased successfully");
    revalidate();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev.toString());
        next.delete("topup");
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams, revalidate]);

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    if (!fetcher.data) return;

    if ("checkoutUrl" in fetcher.data && fetcher.data.success) {
      window.location.href = (
        fetcher.data as { checkoutUrl: string }
      ).checkoutUrl;
      return;
    }

    if ("errors" in fetcher.data) {
      closeDialog();
      toast.error(
        (fetcher.data as { errors: { general: string } }).errors.general,
      );
      return;
    }

    if (fetcher.data.success) {
      toast.success(
        successMessages[(fetcher.data as { intent: string }).intent] ??
          "Billing updated",
      );
      revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidate]);

  const submitAddCredits = (amount: number, note: string) => {
    fetcher.submit(
      JSON.stringify({
        intent: "ADD_CREDITS",
        payload: {
          amount,
          note,
          idempotencyKey: `admin-credit:${globalThis.crypto.randomUUID()}`,
        },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openAddCreditsDialog = () => {
    addDialog(<AddCreditsDialog onAddCreditsClicked={submitAddCredits} />);
  };

  const submitAssignPlan = (planId: string) => {
    fetcher.submit(
      JSON.stringify({ intent: "ASSIGN_PLAN", payload: { planId } }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openAssignPlanDialog = () => {
    addDialog(
      <AssignBillingPlanDialog
        plans={billingPlans}
        currentPlanId={balanceSummary?.plan._id}
        onAssignPlanClicked={submitAssignPlan}
      />,
    );
  };

  const submitSetBillingUser = (userId: string) => {
    fetcher.submit(
      JSON.stringify({ intent: "SET_BILLING_USER", payload: { userId } }),
      { method: "POST", encType: "application/json" },
    );
  };

  const submitTopUp = (amount: number) => {
    fetcher.submit(
      JSON.stringify({ intent: "INITIATE_TOPUP", payload: { amount } }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openTopUpDialog = () => {
    addDialog(<TopUpDialog onTopUpClicked={submitTopUp} />);
  };

  const openSetBillingUserDialog = () => {
    addDialog(
      <SetBillingUserDialogContainer
        teamId={team._id}
        currentBillingUserId={team.billingUser}
        onSetBillingUserClicked={submitSetBillingUser}
      />,
    );
  };

  return (
    <TeamBilling
      balanceSummary={balanceSummary}
      pendingPlanChange={pendingPlanChange}
      closedPeriods={closedPeriods}
      team={team}
      credits={credits}
      billingUserInfo={billingUserInfo}
      isSubmitting={fetcher.state !== "idle"}
      isBillingEnabled={billingEnabled}
      creditsSearchValue={creditsSearchValue}
      creditsCurrentPage={creditsCurrentPage}
      isCreditsSyncing={isCreditsSyncing}
      spendAnalytics={spendAnalytics}
      spendGranularity={spendGranularity}
      onSpendGranularityChanged={setSpendGranularity}
      onCreditsSearchValueChanged={setCreditsSearchValue}
      onCreditsPaginationChanged={setCreditsCurrentPage}
      onAddCreditsClicked={openAddCreditsDialog}
      onTopUpClicked={openTopUpDialog}
      onAssignPlanClicked={openAssignPlanDialog}
      onSetBillingUserClicked={openSetBillingUserDialog}
      userCosts={userCosts}
      userCostsCurrentPage={userCostsCurrentPage}
      userCostsSortValue={userCostsSortValue}
      isUserCostsSyncing={isUserCostsSyncing}
      onUserCostsPaginationChanged={setUserCostsCurrentPage}
      onUserCostsSortValueChanged={setUserCostsSortValue}
    />
  );
}
