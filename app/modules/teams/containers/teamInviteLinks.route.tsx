import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useOutletContext,
} from "react-router";
import { toast } from "sonner";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import { UserService } from "~/modules/users/user";
import TeamAuthorization from "../authorization";
import ConfirmRevokeInviteDialog from "../components/confirmRevokeInviteDialog";
import TeamInviteLinks from "../components/teamInviteLinks";
import { TeamInviteService } from "../teamInvites";
import type { TeamInvite } from "../teamInvites.types";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teamInviteLinks.route";
import CreateTeamInviteLinkDialogContainer from "./createTeamInviteLinkDialog.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.Invites.canView(user, params.teamId)) {
    return redirect(`/teams/${params.teamId}`);
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "-createdAt",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { team: params.teamId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt", "usedCount"],
    filterableFields: [],
  });

  const invites = await TeamInviteService.paginate(query);

  const creatorIds = Array.from(
    new Set(invites.data.map((i: TeamInvite) => i.createdBy).filter(Boolean)),
  );
  const creators = creatorIds.length
    ? await UserService.find({ match: { _id: { $in: creatorIds } } })
    : [];
  const createdByById = Object.fromEntries(
    creators.map((u) => [u._id, { name: u.name, username: u.username }]),
  );

  return { invites, createdByById };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const { intent, payload = {} } = await request.json();

  if (intent === "CREATE_TEAM_INVITE_LINK") {
    if (!TeamAuthorization.Invites.canCreate(user, params.teamId)) {
      return data({ errors: { general: "Forbidden" } }, { status: 403 });
    }
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    const maxUses = Number(payload.maxUses);
    if (!name || name.length > 100) {
      return data(
        { errors: { name: "Name is required (1–100 chars)" } },
        { status: 400 },
      );
    }
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 500) {
      return data(
        { errors: { maxUses: "Max uses must be 1–500" } },
        { status: 400 },
      );
    }
    const invite = await TeamInviteService.create({
      team: params.teamId,
      name,
      maxUses,
      createdBy: user._id,
    });
    trackServerEvent({
      name: "team_invite_link_created",
      userId: user._id,
      params: { team_id: params.teamId, max_uses: maxUses },
    });
    return data({ success: true, invite });
  }

  if (intent === "REVOKE_TEAM_INVITE_LINK") {
    if (!TeamAuthorization.Invites.canRevoke(user, params.teamId)) {
      return data({ errors: { general: "Forbidden" } }, { status: 403 });
    }
    const inviteLinkId =
      typeof payload.inviteLinkId === "string" ? payload.inviteLinkId : "";
    const existing = await TeamInviteService.findOne({
      _id: inviteLinkId,
      team: params.teamId,
    });
    if (!existing) {
      return data({ errors: { general: "Not found" } }, { status: 404 });
    }
    const updated = await TeamInviteService.revokeById(inviteLinkId, user._id);
    return data({ success: true, invite: updated });
  }

  return data({ errors: { intent: "Invalid intent" } }, { status: 400 });
}

export default function TeamInviteLinksRoute() {
  const { invites, createdByById } = useLoaderData<typeof loader>();
  const ctx = useOutletContext<{ team: Team }>();
  const fetcher = useFetcher<typeof action>();

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "-createdAt",
    filters: {},
  });

  // This route-level fetcher is only used for REVOKE. CREATE is submitted by
  // the dialog's own fetcher, so its success is announced inside the dialog.
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if ("success" in fetcher.data && fetcher.data.success) {
      toast.success("Invite link revoked");
    } else if ("errors" in fetcher.data) {
      const msg =
        (fetcher.data as { errors: { general?: string } }).errors.general ||
        "An error occurred";
      toast.error(msg);
    }
  }, [fetcher.state, fetcher.data]);

  const onCreateClicked = () => {
    addDialog(<CreateTeamInviteLinkDialogContainer teamId={ctx.team._id} />);
  };

  const onCopyClicked = (invite: TeamInvite) => {
    navigator.clipboard.writeText(
      `${window.location.origin}/join/${invite.slug}`,
    );
    toast.success("Link copied");
  };

  const onRevokeClicked = (invite: TeamInvite) => {
    addDialog(
      <ConfirmRevokeInviteDialog
        inviteName={invite.name}
        onConfirm={() => {
          fetcher.submit(
            JSON.stringify({
              intent: "REVOKE_TEAM_INVITE_LINK",
              payload: { inviteLinkId: invite._id },
            }),
            { method: "POST", encType: "application/json" },
          );
        }}
      />,
    );
  };

  return (
    <TeamInviteLinks
      invites={invites.data}
      totalPages={invites.totalPages}
      currentPage={currentPage}
      searchValue={searchValue}
      sortValue={sortValue}
      isSyncing={isSyncing}
      createdByById={createdByById}
      onCreateClicked={onCreateClicked}
      onCopyClicked={onCopyClicked}
      onRevokeClicked={onRevokeClicked}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onSortValueChanged={setSortValue}
    />
  );
}
