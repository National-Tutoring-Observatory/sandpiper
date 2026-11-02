import { Collection } from "@/components/ui/collection";
import type { ApiKey } from "../apiKeys.types";
import getApiKeysItemAttributes from "../helpers/getApiKeysItemAttributes";
import ApiKeyItem from "./apiKeyItem";

interface Props {
  apiKeys: ApiKey[];
  onRenameClicked: (apiKey: ApiKey) => void;
  onRegenerateClicked: (apiKey: ApiKey) => void;
  onRevokeClicked: (apiKey: ApiKey) => void;
}

export default function ApiKeys({
  apiKeys,
  onRenameClicked,
  onRegenerateClicked,
  onRevokeClicked,
}: Props) {
  return (
    <Collection
      items={apiKeys}
      itemsLayout="list"
      currentPage={1}
      totalPages={1}
      onPaginationChanged={() => {}}
      filters={[]}
      filtersValues={{}}
      onSortValueChanged={() => {}}
      emptyAttributes={{
        title: "No API keys yet",
        description: "Create an API key to access this team's data.",
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
      onActionClicked={() => {}}
    />
  );
}
