export function queuesUrl(type?: string, state?: string): string {
  let url = "/admin/queues";
  if (type !== undefined) url += `/${type}`;
  if (state !== undefined) url += `/${state}`;
  return url;
}
