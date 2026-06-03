import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import getDateString from "~/modules/app/helpers/getDateString";
import PromptAuthorization from "~/modules/prompts/authorization";
import type { Prompt } from "~/modules/prompts/prompts.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamPromptsItemAttributes(
  item: Prompt,
  user: User | null,
) {
  const canView = PromptAuthorization.canView(user, item);

  return {
    id: item._id,
    title: item.name,
    to: canView
      ? `/teams/${item.team}/prompts/${item._id}/${item.productionVersion}`
      : undefined,
    meta: [
      {
        text: `Annotation type - ${getAnnotationLabel(item.annotationType)}`,
      },
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
