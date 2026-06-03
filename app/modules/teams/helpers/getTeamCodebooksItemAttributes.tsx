import getReferenceId from "~/helpers/getReferenceId";
import getDateString from "~/modules/app/helpers/getDateString";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import type { Codebook } from "~/modules/codebooks/codebooks.types";
import { codebookUrl } from "~/modules/codebooks/helpers/codebookUrls";
import type { User } from "~/modules/users/users.types";

export default function getTeamCodebooksItemAttributes(
  item: Codebook,
  user: User | null,
) {
  const canView = CodebookAuthorization.canView(user, item);

  return {
    id: item._id,
    title: item.name,
    description: item.description || "",
    to: canView
      ? codebookUrl(getReferenceId(item.team), item._id, item.productionVersion)
      : undefined,
    meta: [
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
