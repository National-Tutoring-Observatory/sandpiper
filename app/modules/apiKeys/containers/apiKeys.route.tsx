import { redirect, useLoaderData } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import type { ApiKey } from "../apiKeys.types";
import ApiKeysAuthorization from "../authorization";
import ApiKeys from "../components/apiKeys";
import type { Route } from "./+types/apiKeys.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!ApiKeysAuthorization.canView(user, params.teamId)) {
    return redirect(`/teams/${params.teamId}`);
  }

  // Placeholder until this is wired up to the tokens service.
  const apiKeys: ApiKey[] = [
    {
      _id: "1",
      name: "Research pipeline",
      tokenPrefix: "sp_9e6d336a",
      createdAt: "2026-10-01T12:00:00.000Z",
      expiresAt: "2027-10-01T12:00:00.000Z",
      lastUsedAt: "2026-11-01T08:15:00.000Z",
    },
    {
      _id: "2",
      name: "Local development",
      tokenPrefix: "sp_8a2d834b",
      createdAt: "2026-10-20T09:30:00.000Z",
    },
    {
      _id: "3",
      name: "Pilot study",
      tokenPrefix: "sp_d4e3b829",
      createdAt: "2025-09-12T14:00:00.000Z",
      expiresAt: "2026-09-12T14:00:00.000Z",
      lastUsedAt: "2026-09-10T16:45:00.000Z",
    },
    {
      _id: "4",
      name: "Old integration",
      tokenPrefix: "sp_7c8b945e",
      createdAt: "2026-03-01T10:00:00.000Z",
      lastUsedAt: "2026-06-15T11:20:00.000Z",
      isDeleted: true,
    },
  ];

  return { apiKeys };
}

export default function ApiKeysRoute() {
  const { apiKeys } = useLoaderData<typeof loader>();

  // Placeholders until the dialogs and actions exist.
  const onRenameClicked = (apiKey: ApiKey) => {
    toast.info(`Rename ${apiKey.name}`);
  };

  const onRegenerateClicked = (apiKey: ApiKey) => {
    toast.info(`Regenerate ${apiKey.name}`);
  };

  const onRevokeClicked = (apiKey: ApiKey) => {
    toast.info(`Revoke ${apiKey.name}`);
  };

  return (
    <ApiKeys
      apiKeys={apiKeys}
      onRenameClicked={onRenameClicked}
      onRegenerateClicked={onRegenerateClicked}
      onRevokeClicked={onRevokeClicked}
    />
  );
}
