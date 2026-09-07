import map from "lodash/map";
import sortBy from "lodash/sortBy";
import getDateString from "~/modules/app/helpers/getDateString";
import type { Session } from "~/modules/sessions/sessions.types";
import type { Tag } from "~/modules/tags/tags.types";

export default function getSessionsItemAttributes(item: Session) {
  const status =
    item.hasConverted === true
      ? "Converted"
      : item.hasErrored
        ? "Failed"
        : "Not converted";

  const populatedTags = (item.tags ?? []).filter(
    (tag): tag is Tag => typeof tag !== "string",
  );
  const tags = map(sortBy(populatedTags, "name"), (tag) => {
    return {
      text: tag.name,
      color: tag.color,
    };
  });

  return {
    id: item._id,
    title: item.name,
    to: item.hasConverted ? undefined : undefined,
    isDisabled: !item.hasConverted,
    meta: [
      {
        text: `File type - ${item.fileType}`,
      },
      {
        text: `Status - ${status}`,
      },
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
      ...tags,
    ],
  };
}
