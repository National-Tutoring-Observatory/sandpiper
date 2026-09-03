import getDateString from "~/modules/app/helpers/getDateString";
import type { Tag } from "../tags.types";

export default function getTagsItemAttributes(item: Tag) {
  return {
    id: item._id,
    title: item.name,
    meta: [
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
