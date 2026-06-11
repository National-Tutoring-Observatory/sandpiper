export function promptLibraryUrl(promptId?: string): string {
  let url = "/prompt-library";
  if (promptId !== undefined) url += `/${promptId}`;
  return url;
}
