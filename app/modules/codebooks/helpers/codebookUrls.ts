export const CODEBOOKS_CREATE_PARAM = "create";

export function codebooksUrl(teamId: string): string {
  return `/teams/${teamId}/codebooks`;
}

export function codebookUrl(
  teamId: string,
  codebookId: string,
  version?: number | string,
): string {
  let url = `/teams/${teamId}/codebooks/${codebookId}`;
  if (version !== undefined) url += `/${version}`;
  return url;
}
