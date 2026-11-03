import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ApiMethod, ApiQuery } from "../cache.types";
import requestApi from "../helpers/requestApi";

type ApiResponse = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  currentPage?: number;
  totalPages?: number;
  count?: number;
};

type MutateArgs = {
  api?: string;
  method: Exclude<ApiMethod, "GET">;
  query?: ApiQuery;
  data?: unknown;
};

export default function useCache({
  api,
  query,
  initialData,
}: {
  api: string;
  query?: ApiQuery;
  initialData?: ApiResponse["data"];
}) {
  const queryClient = useQueryClient();

  const result = useQuery({
    queryKey: [api, query],
    queryFn: () => requestApi<ApiResponse>({ api, query }),
    initialData: initialData === undefined ? undefined : { data: initialData },
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: ({
      api: mutateApi = api,
      method,
      query: mutateQuery,
      data,
    }: MutateArgs) =>
      requestApi<ApiResponse>({
        api: mutateApi,
        method,
        query: mutateQuery,
        data,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api] }),
  });

  return {
    data: result.data?.data,
    currentPage: result.data?.currentPage,
    totalPages: result.data?.totalPages,
    count: result.data?.count,
    error: result.error,
    isPending: result.isPending,
    isFetching: result.isFetching,
    fetch: result.refetch,
    mutate: mutation.mutate,
    isMutating: mutation.isPending,
  };
}
