import type { CollectionItemMeta } from "@/components/ui/collectionItemContent";
import { CheckCircle2 } from "lucide-react";
import getReferenceId from "~/helpers/getReferenceId";
import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import getDateString from "~/modules/app/helpers/getDateString";
import PromptAuthorization from "~/modules/prompts/authorization";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import type { Prompt } from "~/modules/prompts/prompts.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamPromptsItemAttributes(
  item: Prompt,
  user: User | null,
) {
  const canView = PromptAuthorization.canView(user, item);
  const meta: CollectionItemMeta[] = [
    {
      text: `Annotation type - ${getAnnotationLabel(item.annotationType)}`,
    },
    {
      text: `Created at - ${getDateString(item.createdAt)}`,
    },
  ];

  if (item.library?.isPublished) {
    meta.push({
      icon: <CheckCircle2 />,
      text: "Published to library",
    });
  }

  return {
    id: item._id,
    title: item.name,
    to: canView
      ? promptsUrl(getReferenceId(item.team), item._id, item.productionVersion)
      : undefined,
    meta,
  };
}
