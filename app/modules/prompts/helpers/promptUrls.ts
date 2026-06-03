export function promptsUrl(
  teamId: string,
  promptId?: string,
  version?: number | string,
): string {
  let url = `/teams/${teamId}/prompts`;
  if (promptId !== undefined) url += `/${promptId}`;
  if (version !== undefined) url += `/${version}`;
  return url;
}
