import { data, redirect, useFetcher, useLoaderData } from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { PromptService } from "~/modules/prompts/prompt";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import PromptLibrary from "../components/promptLibrary";
import copyPromptToActiveTeam from "../helpers/copyPromptToActiveTeam.server";
import { useCopyPromptResult } from "../hooks/useCopyPromptResult";
import type { Route } from "./+types/promptLibrary.route";

const DEFAULT_SORT = "-library.publishedAt";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!PromptLibraryAuthorization.canView(user)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: DEFAULT_SORT,
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { "library.isPublished": true, deletedAt: { $exists: false } },
    queryParams,
    searchableFields: [
      "name",
      "library.description",
      "library.authors.name",
      "library.authors.affiliation",
    ],
    sortableFields: ["name", "library.publishedAt"],
    filterableFields: ["annotationType"],
  });

  const [prompts, activeTeamId] = await Promise.all([
    PromptService.paginate({
      match: query.match,
      sort: query.sort ?? DEFAULT_SORT,
      page: query.page,
    }),
    resolveActiveTeam(request, user),
  ]);

  return { prompts, activeTeamId };
}

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  const { intent, entityId } = await request.json();

  if (intent !== "COPY_PROMPT") {
    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  if (typeof entityId !== "string" || !entityId) {
    return data(
      { errors: { general: "Prompt id is required" } },
      { status: 400 },
    );
  }

  return copyPromptToActiveTeam(request, user, entityId);
}

export default function PromptLibraryRoute() {
  const { prompts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  useCopyPromptResult(fetcher);

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    filtersValues,
    setFiltersValues,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: DEFAULT_SORT,
    filters: {},
  });

  const submitCopyPrompt = (promptId: string) => {
    fetcher.submit(
      JSON.stringify({ intent: "COPY_PROMPT", entityId: promptId }),
      {
        method: "POST",
        encType: "application/json",
      },
    );
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    if (action === "COPY") {
      submitCopyPrompt(id);
    }
  };

  const breadcrumbs = [{ text: "Prompt Library" }];

  return (
    <PromptLibrary
      prompts={prompts.data}
      breadcrumbs={breadcrumbs}
      totalPages={prompts.totalPages}
      searchValue={searchValue}
      currentPage={currentPage}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onFiltersValueChanged={(filters) =>
        setFiltersValues({ ...filtersValues, ...filters })
      }
      onSortValueChanged={setSortValue}
      onItemActionClicked={onItemActionClicked}
    />
  );
}
