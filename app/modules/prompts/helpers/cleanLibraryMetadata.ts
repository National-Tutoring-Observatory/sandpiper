import type { PromptAuthor, PromptPaperRef } from "../prompts.types";

export function cleanAuthors(input: unknown): PromptAuthor[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((author) => ({
      name: typeof author?.name === "string" ? author.name.trim() : "",
      affiliation:
        typeof author?.affiliation === "string" && author.affiliation.trim()
          ? author.affiliation.trim()
          : undefined,
    }))
    .filter((author) => author.name);
}

export function cleanPaperRefs(input: unknown): PromptPaperRef[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((paper) => ({
      title: typeof paper?.title === "string" ? paper.title.trim() : "",
      url: typeof paper?.url === "string" ? paper.url.trim() : "",
    }))
    .filter((paper) => paper.title && paper.url);
}
