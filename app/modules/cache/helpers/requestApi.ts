import type { ApiMethod, ApiQuery } from "../cache.types";

function buildUrl(api: string, query: ApiQuery = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
  return searchParams.size ? `${api}?${searchParams}` : api;
}

export default async function requestApi<T>({
  api,
  method = "GET",
  query,
  data,
}: {
  api: string;
  method?: ApiMethod;
  query?: ApiQuery;
  data?: unknown;
}): Promise<T> {
  const response = await fetch(buildUrl(api, query), {
    method,
    headers:
      data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      body?.error?.message ?? `Request failed with status ${response.status}`,
    );
  }
  return body as T;
}
