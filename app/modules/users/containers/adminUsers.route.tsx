import { useEffect } from "react";
import { data, redirect, useFetcher } from "react-router";
import { toast } from "sonner";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuditService } from "~/modules/audits/audit";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { userIsSuperAdmin } from "~/modules/authorization/helpers/superAdmin";
import addDialog from "~/modules/dialogs/addDialog";
import { TeamService } from "~/modules/teams/team";
import UserManagementAuthorization from "../authorization";
import AdminUsers from "../components/adminUsers";
import EditUserDialog from "../components/editUserDialog";
import UserDetailDialog from "../components/userDetailDialog";
import { UserService } from "../user";
import type { User } from "../users.types";
import AssignSuperAdminDialogContainer from "./assignSuperAdminDialogContainer";
import RevokeSuperAdminDialogContainer from "./revokeSuperAdminDialogContainer";

import type { Route } from "./+types/adminUsers.route";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  if (!userIsSuperAdmin(user)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "username",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: {},
    queryParams,
    searchableFields: ["username", "email", "name", "institution"],
    sortableFields: ["username", "name", "createdAt"],
  });

  const users = await UserService.paginate(query);

  const teamIds = [
    ...new Set(users.data.flatMap((u: User) => u.teams.map((t) => t.team))),
  ];
  const teams = await TeamService.find({ match: { _id: { $in: teamIds } } });
  const teamsByIds: Record<string, string> = Object.fromEntries(
    teams.map((t) => [t._id, t.name]),
  );

  const auditQueryParams = getQueryParamsFromRequest(
    request,
    {
      searchValue: "",
      currentPage: 1,
      sort: "-createdAt",
      filters: {},
    },
    { paramPrefix: "audit" },
  );

  const auditQuery = buildQueryFromParams({
    match: { action: { $in: ["ADD_SUPERADMIN", "REMOVE_SUPERADMIN"] } },
    queryParams: auditQueryParams,
    searchableFields: [
      "performedByUsername",
      "context.targetUsername",
      "context.reason",
    ],
    sortableFields: ["createdAt"],
  });

  const audits = await AuditService.paginate(auditQuery);

  return {
    users,
    audits,
    currentUser: user,
    teamsByIds,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  if (!userIsSuperAdmin(user)) {
    return data({ errors: { general: "Access denied" } }, { status: 403 });
  }

  const { intent, payload = {} } = await request.json();

  switch (intent) {
    case "ASSIGN_SUPER_ADMIN": {
      const { targetUserId, reason } = payload;

      if (!targetUserId || typeof targetUserId !== "string") {
        return data(
          { errors: { general: "Invalid request" } },
          { status: 400 },
        );
      }

      if (typeof reason !== "string" || !reason.trim()) {
        return data(
          { errors: { reason: "Reason is required" } },
          { status: 400 },
        );
      }

      let targetUser;
      try {
        targetUser = await UserService.findById(targetUserId);
      } catch {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (!targetUser) {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (
        !UserManagementAuthorization.canAssignSuperAdminToUser({
          target: targetUser,
          performer: user,
        })
      ) {
        return data(
          { errors: { general: "Cannot perform this action" } },
          { status: 400 },
        );
      }

      try {
        await UserService.assignSuperAdminRole({
          targetUser,
          performedByUser: user,
          reason: reason.trim(),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return data({ errors: { general: errorMessage } }, { status: 500 });
      }

      return data({ success: true, intent: "ASSIGN_SUPER_ADMIN" });
    }

    case "REVOKE_SUPER_ADMIN": {
      const { targetUserId, reason } = payload;

      if (!targetUserId || typeof targetUserId !== "string") {
        return data(
          { errors: { general: "Invalid request" } },
          { status: 400 },
        );
      }

      if (typeof reason !== "string" || !reason.trim()) {
        return data(
          { errors: { reason: "Reason is required" } },
          { status: 400 },
        );
      }

      let targetUser;
      try {
        targetUser = await UserService.findById(targetUserId);
      } catch {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (!targetUser) {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (
        !UserManagementAuthorization.canRevokeSuperAdminFromUser({
          target: targetUser,
          performer: user,
        })
      ) {
        return data(
          { errors: { general: "Cannot perform this action" } },
          { status: 400 },
        );
      }

      try {
        await UserService.revokeSuperAdminRole({
          targetUser,
          performedByUser: user,
          reason: reason.trim(),
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return data({ errors: { general: errorMessage } }, { status: 500 });
      }

      return data({ success: true, intent: "REVOKE_SUPER_ADMIN" });
    }

    case "UPDATE_USER": {
      const { targetUserId, name, email } = payload;

      if (!targetUserId || typeof targetUserId !== "string") {
        return data(
          { errors: { general: "Invalid request" } },
          { status: 400 },
        );
      }

      if (!UserManagementAuthorization.canUpdate(user)) {
        return data(
          { errors: { general: "Cannot perform this action" } },
          { status: 403 },
        );
      }

      const trimmedName = typeof name === "string" ? name.trim() : "";
      const trimmedEmail = typeof email === "string" ? email.trim() : "";

      if (!trimmedEmail) {
        return data(
          { errors: { email: "Email is required" } },
          { status: 400 },
        );
      }

      let targetUser;
      try {
        targetUser = await UserService.findById(targetUserId);
      } catch {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (!targetUser) {
        return data({ errors: { general: "User not found" } }, { status: 400 });
      }

      if (trimmedEmail) {
        const existingByEmail = await UserService.findOne({
          email: trimmedEmail,
          _id: { $ne: targetUserId },
        });
        if (existingByEmail) {
          return data(
            { errors: { email: "Email is already in use" } },
            { status: 400 },
          );
        }
      }

      try {
        await UserService.updateById(targetUserId, {
          name: trimmedName,
          email: trimmedEmail,
        } as Partial<User>);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return data({ errors: { general: errorMessage } }, { status: 500 });
      }

      return data({ success: true, intent: "UPDATE_USER" });
    }

    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
}

export default function UserManagementRoute({
  loaderData,
}: Route.ComponentProps) {
  const { users, audits, currentUser, teamsByIds } = loaderData;
  const fetcher = useFetcher();

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    filtersValues,
    setFiltersValues,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "username",
    filters: {},
  });

  const {
    searchValue: auditSearchValue,
    setSearchValue: setAuditSearchValue,
    currentPage: auditCurrentPage,
    setCurrentPage: setAuditCurrentPage,
    sortValue: auditSortValue,
    setSortValue: setAuditSortValue,
    isSyncing: isAuditSyncing,
  } = useSearchQueryParams(
    {
      searchValue: "",
      currentPage: 1,
      sortValue: "-createdAt",
      filters: {},
    },
    { paramPrefix: "audit" },
  );

  const breadcrumbs = [{ text: "Users" }];

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        fetcher.data.success &&
        fetcher.data.intent === "ASSIGN_SUPER_ADMIN"
      ) {
        toast.success("User promoted to super admin");
        addDialog(null);
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "REVOKE_SUPER_ADMIN"
      ) {
        toast.success("Super admin status revoked");
        addDialog(null);
      } else if (fetcher.data.errors) {
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data]);

  const onAssignSuperAdminClicked =
    (targetUserId: string) => (reason: string) => {
      fetcher.submit(
        JSON.stringify({
          intent: "ASSIGN_SUPER_ADMIN",
          payload: { targetUserId, reason },
        }),
        { method: "POST", encType: "application/json" },
      );
    };

  const onRevokeSuperAdminClicked =
    (targetUserId: string) => (reason: string) => {
      fetcher.submit(
        JSON.stringify({
          intent: "REVOKE_SUPER_ADMIN",
          payload: { targetUserId, reason },
        }),
        { method: "POST", encType: "application/json" },
      );
    };

  const openEditUserDialog = (targetUser: User) => {
    addDialog(
      <EditUserDialog
        user={targetUser}
        onUserUpdated={() => {
          toast.success("User updated");
        }}
      />,
    );
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const targetUser = users.data.find((u: User) => u._id === id);
    if (!targetUser) return;

    if (action === "VIEW") {
      addDialog(<UserDetailDialog user={targetUser} teamsByIds={teamsByIds} />);
    } else if (action === "EDIT") {
      openEditUserDialog(targetUser);
    } else if (action === "ASSIGN_SUPER_ADMIN") {
      addDialog(
        <AssignSuperAdminDialogContainer
          targetUser={targetUser}
          isSubmitting={fetcher.state === "submitting"}
          onAssignSuperAdminClicked={onAssignSuperAdminClicked(id)}
        />,
      );
    } else if (action === "REVOKE_SUPER_ADMIN") {
      addDialog(
        <RevokeSuperAdminDialogContainer
          targetUser={targetUser}
          isSubmitting={fetcher.state === "submitting"}
          onRevokeSuperAdminClicked={onRevokeSuperAdminClicked(id)}
        />,
      );
    }
  };

  return (
    <AdminUsers
      users={users.data}
      audits={audits.data}
      auditSearchValue={auditSearchValue}
      auditSortValue={auditSortValue}
      auditCurrentPage={auditCurrentPage}
      auditTotalPages={audits.totalPages}
      currentUser={currentUser}
      breadcrumbs={breadcrumbs}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={users.totalPages}
      sortValue={sortValue}
      filtersValues={filtersValues}
      isSyncing={isSyncing}
      isAuditSyncing={isAuditSyncing}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onSortValueChanged={setSortValue}
      onFiltersValueChanged={setFiltersValues}
      onAuditSearchChanged={setAuditSearchValue}
      onAuditPageChanged={setAuditCurrentPage}
      onAuditSortChanged={setAuditSortValue}
    />
  );
}
