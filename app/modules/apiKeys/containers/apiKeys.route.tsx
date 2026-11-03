import { redirect, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import type { TokenExpirationDays } from "~/modules/tokens/tokens.types";
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

export default function ApiKeysRoute({ params }: Route.ComponentProps) {
  const teamQuery = { teamId: params.teamId };

  const [searchParams] = useSearchParams();
  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    isSyncing,
  } = useSearchQueryParams({ searchValue: "", currentPage: 1 });

  const debouncedSearchValue = searchParams.get("searchValue") || undefined;

  const apiKeys = useCache({
    api: "/api/tokens",
    query: {
      ...teamQuery,
      currentPage,
      searchValue: debouncedSearchValue,
    },
  });

  // Placeholders until the dialogs and actions exist.
  const openCreateApiKeyDialog = () => {
    addDialog(
      <CreateApiKeyDialog onCreateApiKeyClicked={submitCreateApiKey} />,
    );
  };

  const submitCreateApiKey = (
    name: string,
    expiresInDays: TokenExpirationDays,
  ) => {
    apiKeys.mutate(
      { method: "POST", query: teamQuery, data: { name, expiresInDays } },
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
      {
        api: `/api/tokens/${apiKey._id}`,
        method: "PUT",
        query: teamQuery,
        data: { name },
      },
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
      {
        api: `/api/tokens/${apiKey._id}/regenerate`,
        method: "POST",
        query: teamQuery,
      },
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
      { api: `/api/tokens/${apiKey._id}`, method: "DELETE", query: teamQuery },
      {
        onSuccess: () => toast.success("API key revoked"),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <ApiKeys
      apiKeys={apiKeys.data ?? []}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={apiKeys.totalPages ?? 1}
      isSyncing={isSyncing || apiKeys.isFetching}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onCreateClicked={openCreateApiKeyDialog}
      onRenameClicked={openRenameApiKeyDialog}
      onRegenerateClicked={openRegenerateApiKeyDialog}
      onRevokeClicked={openRevokeApiKeyDialog}
    />
  );
}
