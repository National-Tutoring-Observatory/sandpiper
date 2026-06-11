import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import getDateString from "~/modules/app/helpers/getDateString";
import type { Prompt } from "~/modules/prompts/prompts.types";
import { promptLibraryUrl } from "./promptLibraryUrls";

export default function getPromptLibraryItemAttributes(item: Prompt) {
  const authors = item.library?.authors ?? [];
  const authorLine = authors.length
    ? authors.map((a) => a.name).join(", ")
    : null;

  const meta = [
    {
      text: `Annotation type - ${getAnnotationLabel(item.annotationType)}`,
    },
  ];

  if (authorLine) {
    meta.push({ text: `Authors - ${authorLine}` });
  }

  if (item.library?.publishedAt) {
    meta.push({
      text: `Published - ${getDateString(item.library.publishedAt as string)}`,
    });
  }

  return {
    id: item._id,
    title: item.name,
    description: item.library?.description,
    to: promptLibraryUrl(item._id),
    meta,
  };
}
