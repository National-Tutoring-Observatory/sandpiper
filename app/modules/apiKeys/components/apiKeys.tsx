import { Collection } from "@/components/ui/collection";
import type { ApiKey } from "../apiKeys.types";
import getApiKeysItemAttributes from "../helpers/getApiKeysItemAttributes";
import ApiKeyItem from "./apiKeyItem";

interface Props {
  apiKeys: ApiKey[];
  searchValue: string;
  currentPage: number;
  totalPages: number;
  isSyncing: boolean;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onCreateClicked: () => void;
  onRenameClicked: (apiKey: ApiKey) => void;
  onRegenerateClicked: (apiKey: ApiKey) => void;
  onRevokeClicked: (apiKey: ApiKey) => void;
}

export default function ApiKeys({
  apiKeys,
  searchValue,
  currentPage,
  totalPages,
  isSyncing,
  onSearchValueChanged,
  onPaginationChanged,
  onCreateClicked,
  onRenameClicked,
  onRegenerateClicked,
  onRevokeClicked,
}: Props) {
  return (
    <Collection
      items={apiKeys}
      itemsLayout="list"
      actions={[{ action: "CREATE", text: "Create API key" }]}
      hasSearch
      hasPagination
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={totalPages}
      isSyncing={isSyncing}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      filters={[]}
      filtersValues={{}}
      onSortValueChanged={() => {}}
      emptyAttributes={{
        title: "No API keys yet",
        description: "Create an API key to access this team's data.",
        actions: [{ action: "CREATE", text: "Create API key" }],
      }}
      getItemAttributes={getApiKeysItemAttributes}
      renderItem={(apiKey: ApiKey) => (
        <ApiKeyItem
          apiKey={apiKey}
          onRenameClicked={onRenameClicked}
          onRegenerateClicked={onRegenerateClicked}
          onRevokeClicked={onRevokeClicked}
        />
      )}
      getItemActions={() => []}
      onActionClicked={(action) => {
        if (action === "CREATE") onCreateClicked();
      }}
    />
  );
}
