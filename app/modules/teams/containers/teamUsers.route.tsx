import find from "lodash/find";
import { useContext } from "react";
import {
  data,
  redirect,
  useLoaderData,
  useOutletContext,
  useSubmit,
} from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import { UserService } from "~/modules/users/user";
import type { User, UserTeam } from "~/modules/users/users.types";
import TeamAuthorization from "../authorization";
import ConfirmRemoveUserDialog from "../components/confirmRemoveUserDialog";
import TeamUsers from "../components/teamUsers";
import { addSuperAdminToTeam } from "../services/teamUsers.server";
import type { Team, TeamAssignmentOption, TeamRole } from "../teams.types";
import { isTeamAssignmentOption, isTeamRole } from "../teams.types";
import type { Route } from "./+types/teamUsers.route";
import AddSuperAdminToTeamDialogContainer from "./addSuperAdminToTeamDialogContainer";
import AddUserToTeamDialogContainer from "./addUserToTeamDialog.container";
import InviteUserToTeamDialogContainer from "./inviteUserToTeamDialogContainer";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.Users.canView(user, params.teamId)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "username",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { "teams.team": params.teamId },
    queryParams,
    searchableFields: ["username"],
    sortableFields: ["username", "createdAt"],
    filterableFields: [],
  });

  const result = await UserService.find({ match: query.match });
  return { users: { data: result, totalPages: 1, total: result.length } };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const { intent, payload = {} } = await request.json();
  const { userId } = payload;

  switch (intent) {
    case "ADD_SUPERADMIN_TO_TEAM": {
      if (!TeamAuthorization.Users.canRequestAccess(user, params.teamId)) {
        throw new Error("Only super admins can add super admins to teams.");
      }
      const { reason, option } = payload;
      if (!isTeamAssignmentOption(option)) {
        throw new Error("Invalid team assignment option");
      }
      await addSuperAdminToTeam({
        teamId: params.teamId,
        userId: user._id,
        performedByUserId: user._id,
        reason: reason.trim(),
        option: option,
      });
      return {};
    }
    case "ADD_USERS_TO_TEAM": {
      if (!TeamAuthorization.Users.canUpdate(user, params.teamId)) {
        throw new Error("You do not have permission to manage team users.");
      }
      for (const { userId: id, role } of (payload.users ?? []) as Array<{
        userId: string;
        role: string;
      }>) {
        if (!isTeamRole(role)) {
          return data({ errors: { role: "Invalid role" } }, { status: 400 });
        }
        const userDoc = await UserService.findById(id);
        if (userDoc) {
          if (!userDoc.teams) userDoc.teams = [];
          userDoc.teams.push({ team: params.teamId, role: role as TeamRole });
          await UserService.updateById(id, { teams: userDoc.teams });
        }
      }
      return {};
    }
    case "UPDATE_USER_ROLE": {
      if (!TeamAuthorization.Users.canUpdate(user, params.teamId)) {
        throw new Error("You do not have permission to manage team users.");
      }
      const { userId: targetUserId, role: newRole } = payload;
      if (!targetUserId) return {};
      if (!isTeamRole(newRole)) {
        return data({ errors: { role: "Invalid role" } }, { status: 400 });
      }
      const targetUser = await UserService.findById(targetUserId);
      if (!targetUser) return {};
      const updatedTeams = targetUser.teams.map((t: UserTeam) =>
        t.team === params.teamId ? { ...t, role: newRole } : t,
      );
      await UserService.updateById(targetUserId, { teams: updatedTeams });
      return {};
    }
    case "REMOVE_USER_FROM_TEAM":
      if (!TeamAuthorization.Users.canUpdate(user, params.teamId)) {
        throw new Error("You do not have permission to manage team users.");
      }
      if (!userId) return {};
      await UserService.removeTeam(userId, params.teamId);
      return {};
    default:
      return {};
  }
}

export default function TeamUsersRoute() {
  const data = useLoaderData<typeof loader>();
  const ctx = useOutletContext<{ team: Team }>();
  const submit = useSubmit();
  const user = useContext(AuthenticationContext) as User;

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

  const onAddUsersClicked = (
    users: Array<{ userId: string; role: TeamRole }>,
  ) => {
    submit(
      JSON.stringify({ intent: "ADD_USERS_TO_TEAM", payload: { users } }),
      { method: "PUT", encType: "application/json" },
    );
  };

  const onAddSuperAdminClicked = (
    reason: string,
    option: TeamAssignmentOption,
  ) => {
    submit(
      JSON.stringify({
        intent: "ADD_SUPERADMIN_TO_TEAM",
        payload: { reason, option },
      }),
      { method: "PUT", encType: "application/json" },
    );
  };

  const onAddSuperAdminToTeamButtonClicked = () => {
    addDialog(
      <AddSuperAdminToTeamDialogContainer
        onAddSuperAdminClicked={onAddSuperAdminClicked}
      />,
    );
  };

  const onAddUserToTeamButtonClicked = () => {
    addDialog(
      <AddUserToTeamDialogContainer
        teamId={ctx.team._id}
        onAddUsersClicked={onAddUsersClicked}
      />,
    );
  };

  const onInviteUserToTeamButtonClicked = () => {
    addDialog(<InviteUserToTeamDialogContainer teamId={ctx.team._id} />);
  };

  const onChangeUserRoleClicked = (targetUser: User, newRole: TeamRole) => {
    submit(
      JSON.stringify({
        intent: "UPDATE_USER_ROLE",
        payload: { userId: targetUser._id, role: newRole },
      }),
      { method: "PUT", encType: "application/json" },
    );
  };

  const onRemoveUserFromTeamClicked = (userId: string) => {
    addDialog(
      <ConfirmRemoveUserDialog
        onConfirm={() => {
          submit(
            JSON.stringify({
              intent: "REMOVE_USER_FROM_TEAM",
              payload: { userId },
            }),
            { method: "PUT", encType: "application/json" },
          );
        }}
      />,
    );
  };

  const onActionClicked = (action: string) => {
    switch (action) {
      case "REQUEST_ACCESS":
        onAddSuperAdminToTeamButtonClicked();
        break;
      case "ADD_USER":
        onAddUserToTeamButtonClicked();
        break;
      case "INVITE_USER":
        onInviteUserToTeamButtonClicked();
        break;
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const targetUser = find(data.users.data, { _id: id });
    if (!targetUser) return null;
    switch (action) {
      case "REMOVE":
        onRemoveUserFromTeamClicked(targetUser._id);
        break;
      case "MAKE_ADMIN":
        onChangeUserRoleClicked(targetUser, "ADMIN");
        break;
      case "MAKE_MEMBER":
        onChangeUserRoleClicked(targetUser, "MEMBER");
        break;
    }
  };

  const onSearchValueChanged = (searchValue: string) => {
    setSearchValue(searchValue);
  };

  const onPaginationChanged = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onFiltersValueChanged = (
    filterValue: Record<string, string | null>,
  ) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

  const users = data.users.data ?? [];

  return (
    <TeamUsers
      users={users}
      team={ctx.team}
      user={user}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={data.users.totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
