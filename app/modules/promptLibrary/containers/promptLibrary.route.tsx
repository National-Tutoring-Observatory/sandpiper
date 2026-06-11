import { useEffect } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "react-router";
import { toast } from "sonner";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import { PromptService } from "~/modules/prompts/prompt";
import PromptLibraryAuthorization from "~/modules/prompts/promptLibraryAuthorization";
import resolveActiveTeam from "~/modules/teams/helpers/resolveActiveTeam.server";
import PromptLibrary from "../components/promptLibrary";
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

  const prompts = await PromptService.listLibrary({
    search: queryParams.searchValue || undefined,
    annotationType: queryParams.filters?.annotationType,
    page: queryParams.currentPage,
    sort: queryParams.sort,
  });

  const activeTeamId = await resolveActiveTeam(request, user);

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

  const activeTeamId = await resolveActiveTeam(request, user);
  if (!activeTeamId) {
    return data(
      { errors: { general: "Select a team before copying a prompt." } },
      { status: 400 },
    );
  }
  if (!PromptLibraryAuthorization.canCopy(user, activeTeamId)) {
    return data(
      {
        errors: {
          general: "You can only copy prompts into a team you belong to.",
        },
      },
      { status: 403 },
    );
  }

  const copy = await PromptService.copyFromLibrary(
    entityId,
    activeTeamId,
    user._id,
  );
  if (!copy) {
    return data(
      { errors: { general: "Prompt not found in library." } },
      { status: 404 },
    );
  }

  return data({
    success: true,
    intent: "COPY_PROMPT",
    data: {
      prompt: copy,
      redirectTo: promptsUrl(activeTeamId, copy._id, copy.productionVersion),
    },
  });
}

export default function PromptLibraryRoute() {
  const { prompts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();

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

  useEffect(() => {
    if (fetcher.state !== "idle") return;
    const result = fetcher.data as
      | {
          success?: boolean;
          intent?: string;
          data?: { redirectTo?: string };
          errors?: { general?: string };
        }
      | undefined;
    if (!result) return;
    if (
      result.success &&
      result.intent === "COPY_PROMPT" &&
      result.data?.redirectTo
    ) {
      toast.success("Prompt copied to your team.");
      navigate(result.data.redirectTo);
    } else if (result.errors) {
      toast.error(result.errors.general || "An error occurred");
    }
  }, [fetcher.state, fetcher.data, navigate]);

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
