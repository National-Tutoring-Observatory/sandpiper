import { useEffect } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import SystemAdminAuthorization from "~/modules/authorization/systemAdminAuthorization";
import addDialog from "~/modules/dialogs/addDialog";
import getQueue from "~/modules/queues/helpers/getQueue";
import { UserService } from "~/modules/users/user";
import type { User } from "~/modules/users/users.types";
import ConfirmRemoveUserFromFeatureFlagDialog from "../components/confirmRemoveUserFromFeatureFlagDialog";
import DeleteFeatureFlagDialog from "../components/deleteFeatureFlagDialog";
import FeatureFlag from "../components/featureFlag";
import { FeatureFlagService } from "../featureFlag";
import type { FeatureFlag as FeatureFlagType } from "../featureFlags.types";
import { featureFlagsUrl } from "../helpers/featureFlagUrls";
import type { Route } from "./+types/featureFlag.route";
import AddUsersToFeatureFlagDialogContainer from "./addUsersToFeatureFlagDialog.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.FeatureFlags.canManage(user)) {
    return redirect("/");
  }

  const featureFlag = await FeatureFlagService.findById(params.id);
  if (!featureFlag) {
    return redirect(featureFlagsUrl());
  }

  const users = await UserService.find({
    match: { featureFlags: { $in: [featureFlag.name] } },
  });

  return { featureFlag, users };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.FeatureFlags.canManage(user)) {
    return data({ errors: { general: "Access denied" } }, { status: 403 });
  }

  const { intent, payload = {} } = await request.json();
  const { userIds, userId } = payload;

  switch (intent) {
    case "ADD_USERS_TO_FEATURE_FLAG": {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return data(
          { errors: { general: "No users provided" } },
          { status: 400 },
        );
      }

      const featureFlag = await FeatureFlagService.findById(params.id);
      if (!featureFlag) {
        return data(
          { errors: { general: "Feature flag not found" } },
          { status: 404 },
        );
      }

      for (const id of userIds) {
        await UserService.addFeatureFlag(id, featureFlag.name);
      }

      return data({ success: true, intent: "ADD_USERS_TO_FEATURE_FLAG" });
    }

    case "REMOVE_USER_FROM_FEATURE_FLAG": {
      if (!userId || typeof userId !== "string") {
        return data(
          { errors: { general: "User ID is required" } },
          { status: 400 },
        );
      }

      const featureFlag = await FeatureFlagService.findById(params.id);
      if (!featureFlag) {
        return data(
          { errors: { general: "Feature flag not found" } },
          { status: 404 },
        );
      }

      await UserService.removeFeatureFlagFromUser(userId, featureFlag.name);
      return data({ success: true, intent: "REMOVE_USER_FROM_FEATURE_FLAG" });
    }

    case "DELETE_FEATURE_FLAG": {
      const featureFlag = await FeatureFlagService.findById(params.id);
      if (!featureFlag) {
        return redirect(featureFlagsUrl());
      }

      await FeatureFlagService.deleteById(params.id);

      const queue = getQueue("general");
      await queue.add(
        "REMOVE_FEATURE_FLAG",
        { featureFlagName: featureFlag.name, featureFlagId: params.id },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 1000,
          },
        },
      );

      return data({ success: true, intent: "DELETE_FEATURE_FLAG" });
    }

    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

export default function FeatureFlagRoute({
  loaderData,
}: {
  loaderData: {
    featureFlag: FeatureFlagType;
    users: User[];
  };
}) {
  const { featureFlag, users } = loaderData;
  const fetcher = useFetcher();

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        fetcher.data.success &&
        fetcher.data.intent === "ADD_USERS_TO_FEATURE_FLAG"
      ) {
        toast.success("Users added to feature flag");
        addDialog(null);
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "REMOVE_USER_FROM_FEATURE_FLAG"
      ) {
        toast.success("User removed from feature flag");
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "DELETE_FEATURE_FLAG"
      ) {
        toast.success("Feature flag deleted");
        window.location.href = featureFlagsUrl();
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data]);

  const openAddUsersDialog = () => {
    addDialog(
      <AddUsersToFeatureFlagDialogContainer
        featureFlagId={featureFlag._id}
        onAddUsersClicked={submitAddUsers}
        isSubmitting={fetcher.state === "submitting"}
      />,
    );
  };

  const submitAddUsers = (userIds: string[]) => {
    fetcher.submit(
      JSON.stringify({
        intent: "ADD_USERS_TO_FEATURE_FLAG",
        payload: { userIds },
      }),
      { method: "PUT", encType: "application/json" },
    );
  };

  const openConfirmRemoveUserDialog = (userId: string) => {
    addDialog(
      <ConfirmRemoveUserFromFeatureFlagDialog
        onConfirm={() => submitRemoveUserFromFeatureFlag(userId)}
      />,
    );
  };

  const submitRemoveUserFromFeatureFlag = (userId: string) => {
    fetcher.submit(
      JSON.stringify({
        intent: "REMOVE_USER_FROM_FEATURE_FLAG",
        payload: { userId },
      }),
      { method: "PUT", encType: "application/json" },
    );
  };

  const openDeleteFeatureFlagDialog = () => {
    addDialog(
      <DeleteFeatureFlagDialog
        featureFlag={featureFlag}
        onDeleteFeatureFlagClicked={submitDeleteFeatureFlag}
        isSubmitting={fetcher.state === "submitting"}
      />,
    );
  };

  const submitDeleteFeatureFlag = () => {
    fetcher.submit(JSON.stringify({ intent: "DELETE_FEATURE_FLAG" }), {
      method: "DELETE",
      encType: "application/json",
    });
  };

  return (
    <FeatureFlag
      featureFlag={featureFlag}
      users={users}
      onAddUsersClicked={openAddUsersDialog}
      onRemoveUserFromFeatureFlagClicked={openConfirmRemoveUserDialog}
      onDeleteFeatureFlagClicked={openDeleteFeatureFlagDialog}
    />
  );
}
