import { redirect } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import type { ApiKey } from "../apiKeys.types";
import ApiKeysAuthorization from "../authorization";
import ApiKeyCreatedDialog from "../components/apiKeyCreatedDialog";
import ApiKeys from "../components/apiKeys";
import ConfirmRegenerateApiKeyDialog from "../components/confirmRegenerateApiKeyDialog";
import ConfirmRevokeApiKeyDialog from "../components/confirmRevokeApiKeyDialog";
import CreateApiKeyDialog from "../components/createApiKeyDialog";
import RenameApiKeyDialog from "../components/renameApiKeyDialog";
import type { Route } from "./+types/apiKeys.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!ApiKeysAuthorization.canView(user, params.teamId)) {
    return redirect(`/teams/${params.teamId}`);
  }

  return {};
}

export default function ApiKeysRoute() {
  const apiKeys = useCache({
    api: "/api/tokens",
    query: { currentPage: 1 },
    initialData: [],
  });

  // Placeholders until the dialogs and actions exist.
  const openCreateApiKeyDialog = () => {
    addDialog(
      <CreateApiKeyDialog onCreateApiKeyClicked={submitCreateApiKey} />,
    );
  };

  const submitCreateApiKey = (name: string) => {
    apiKeys.mutate(
      { method: "POST", data: { name } },
      {
        onSuccess: (response) => {
          addDialog(
            <ApiKeyCreatedDialog
              token={response.data.token}
              onCopyClicked={onCopyApiKeyClicked}
            />,
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const onCopyApiKeyClicked = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("API key copied");
  };

  const openRenameApiKeyDialog = (apiKey: ApiKey) => {
    addDialog(
      <RenameApiKeyDialog
        apiKey={apiKey}
        onRenameApiKeyClicked={submitRenameApiKey}
      />,
    );
  };

  const submitRenameApiKey = (apiKey: ApiKey, name: string) => {
    apiKeys.mutate(
      { api: `/api/tokens/${apiKey._id}`, method: "PUT", data: { name } },
      {
        onSuccess: () => {
          addDialog(null);
          toast.success("API key renamed");
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openRegenerateApiKeyDialog = (apiKey: ApiKey) => {
    addDialog(
      <ConfirmRegenerateApiKeyDialog
        apiKeyName={apiKey.name}
        onConfirm={() => submitRegenerateApiKey(apiKey)}
      />,
    );
  };

  const submitRegenerateApiKey = (apiKey: ApiKey) => {
    apiKeys.mutate(
      { api: `/api/tokens/${apiKey._id}/regenerate`, method: "POST" },
      {
        onSuccess: (response) => {
          addDialog(
            <ApiKeyCreatedDialog
              token={response.data.token}
              onCopyClicked={onCopyApiKeyClicked}
            />,
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openRevokeApiKeyDialog = (apiKey: ApiKey) => {
    addDialog(
      <ConfirmRevokeApiKeyDialog
        apiKeyName={apiKey.name}
        onConfirm={() => submitRevokeApiKey(apiKey)}
      />,
    );
  };

  const submitRevokeApiKey = (apiKey: ApiKey) => {
    apiKeys.mutate(
      { api: `/api/tokens/${apiKey._id}`, method: "DELETE" },
      {
        onSuccess: () => toast.success("API key revoked"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ApiKeys
      apiKeys={apiKeys.data}
      onCreateClicked={openCreateApiKeyDialog}
      onRenameClicked={openRenameApiKeyDialog}
      onRegenerateClicked={openRegenerateApiKeyDialog}
      onRevokeClicked={openRevokeApiKeyDialog}
    />
  );
}
