import get from "lodash/get";
import { useEffect } from "react";
import { data, redirect, useFetcher, useMatch, useMatches } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import SystemAdminAuthorization from "~/modules/authorization/systemAdminAuthorization";
import addDialog from "~/modules/dialogs/addDialog";
import CreateFeatureFlagDialog from "../components/createFeatureFlagDialog";
import FeatureFlags from "../components/featureFlags";
import { FeatureFlagService } from "../featureFlag";
import type { FeatureFlag } from "../featureFlags.types";
import type { Route } from "./+types/featureFlags.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.FeatureFlags.canManage(user)) {
    return redirect("/");
  }
  const featureFlags = await FeatureFlagService.find({});
  return { featureFlags };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.FeatureFlags.canManage(user)) {
    return data({ errors: { general: "Access denied" } }, { status: 403 });
  }

  const { intent, payload = {} } = await request.json();
  const { name } = payload;

  switch (intent) {
    case "CREATE_FEATURE_FLAG": {
      if (typeof name !== "string" || !name.trim()) {
        return data(
          {
            errors: {
              general: "Feature flag name is required and must be a string",
            },
          },
          { status: 400 },
        );
      }

      const featureFlag = await FeatureFlagService.create({
        name: name.trim(),
      });
      return data({
        success: true,
        intent: "CREATE_FEATURE_FLAG",
        data: featureFlag,
      });
    }

    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function FeatureFlagsRoute({
  loaderData,
}: Route.ComponentProps) {
  const { featureFlags } = loaderData;
  const fetcher = useFetcher();
  const match = useMatch("/admin/featureFlags");
  const matches = useMatches();

  const featureFlag = get(matches, "2.data.featureFlag", {}) as FeatureFlag;
  const breadcrumbs = match
    ? [{ text: "Feature flags" }]
    : [
        { text: "Feature flags", link: "/admin/featureFlags" },
        { text: featureFlag.name },
      ];

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        fetcher.data.success &&
        fetcher.data.intent === "CREATE_FEATURE_FLAG"
      ) {
        toast.success("Feature flag created");
        addDialog(null);
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data]);

  const openCreateFeatureFlagDialog = () => {
    addDialog(
      <CreateFeatureFlagDialog
        onCreateFeatureFlagClicked={submitCreateFeatureFlag}
        isSubmitting={fetcher.state === "submitting"}
      />,
    );
  };

  const submitCreateFeatureFlag = ({ name }: { name: string }) => {
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_FEATURE_FLAG",
        payload: { name },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  return (
    <FeatureFlags
      featureFlags={featureFlags}
      breadcrumbs={breadcrumbs}
      onCreateFeatureFlagButtonClicked={openCreateFeatureFlagDialog}
    />
  );
}
