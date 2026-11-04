import type { ApiKey } from "../apiKeys.types";

export default function getApiKeysItemAttributes(item: ApiKey) {
  return {
    id: item._id,
    title: item.name,
  };
}
