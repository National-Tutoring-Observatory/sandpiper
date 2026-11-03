import { redirect } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import type { ApiKey } from "../apiKeys.types";
import ApiKeysAuthorization from "../authorization";
import ApiKeyCreatedDialog from "../components/apiKeyCreatedDialog";
import ApiKeys from "../components/apiKeys";
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

  // Placeholder until the tokens API supports renaming.
  const submitRenameApiKey = (apiKey: ApiKey, name: string) => {
    addDialog(null);
    toast.info(`Rename ${apiKey.name} to ${name}`);
  };

  const onRegenerateClicked = (apiKey: ApiKey) => {
    toast.info(`Regenerate ${apiKey.name}`);
  };

  const onRevokeClicked = (apiKey: ApiKey) => {
    toast.info(`Revoke ${apiKey.name}`);
  };

  return (
    <ApiKeys
      apiKeys={apiKeys.data}
      onCreateClicked={openCreateApiKeyDialog}
      onRenameClicked={openRenameApiKeyDialog}
      onRegenerateClicked={onRegenerateClicked}
      onRevokeClicked={onRevokeClicked}
    />
  );
}
