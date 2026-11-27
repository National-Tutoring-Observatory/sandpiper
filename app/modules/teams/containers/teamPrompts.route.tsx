import type { FiltersValues } from "@/components/ui/filters";
import find from "lodash/find";
import { useEffect } from "react";
import {
  redirect,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog, { closeDialog } from "~/modules/dialogs/addDialog";
import CreatePromptDialog from "~/modules/prompts/components/createPromptDialog";
import DeletePromptDialog from "~/modules/prompts/components/deletePromptDialog";
import EditPromptDialog from "~/modules/prompts/components/editPromptDialog";
import {
  PROMPTS_CREATE_PARAM,
  promptsUrl,
} from "~/modules/prompts/helpers/promptUrls";
import type { Prompt } from "~/modules/prompts/prompts.types";
import TeamAuthorization from "../authorization";
import TeamPrompts from "../components/teamPrompts";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teamPrompts.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.canView(user, params.teamId)) {
    return redirect("/");
  }

  return {};
}

export default function TeamPromptsRoute({ params }: Route.ComponentProps) {
  const { teamId } = params;
  const ctx = useOutletContext<{ team: Team }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
    sortValue: "name",
    filters: {},
  });

  const teamQuery = { teamId };

  const prompts = useCache({
    api: "/api/prompts",
    query: {
      ...teamQuery,
      currentPage,
      searchValue: searchParams.get("searchValue") || undefined,
      sort: sortValue || undefined,
      annotationType: searchParams.get("filter_annotationType") || undefined,
    },
  });

  const onCreatePromptButtonClicked = () => {
    addDialog(
      <CreatePromptDialog onCreateNewPromptClicked={submitCreatePrompt} />,
    );
  };

  useEffect(() => {
    if (searchParams.get(PROMPTS_CREATE_PARAM) !== "1") return;
    onCreatePromptButtonClicked();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PROMPTS_CREATE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const submitCreatePrompt = ({
    name,
    annotationType,
  }: {
    name: string;
    annotationType: string;
  }) => {
    prompts.mutate(
      { method: "POST", query: teamQuery, data: { name, annotationType } },
      {
        onSuccess: (response) => {
          closeDialog();
          navigate(
            promptsUrl(
              teamId,
              response.data._id,
              response.data.productionVersion,
            ),
          );
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openEditPromptDialog = (prompt: Prompt) => {
    addDialog(
      <EditPromptDialog
        prompt={prompt}
        onEditPromptClicked={submitEditPrompt}
      />,
    );
  };

  const submitEditPrompt = (prompt: Prompt) => {
    prompts.mutate(
      {
        api: `/api/prompts/${prompt._id}`,
        method: "PUT",
        query: teamQuery,
        data: { name: prompt.name },
      },
      {
        onSuccess: () => {
          toast.success("Prompt updated");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openDeletePromptDialog = (prompt: Prompt) => {
    addDialog(
      <DeletePromptDialog
        prompt={prompt}
        onDeletePromptClicked={() => submitDeletePrompt(prompt)}
      />,
    );
  };

  const submitDeletePrompt = (prompt: Prompt) => {
    prompts.mutate(
      {
        api: `/api/prompts/${prompt._id}`,
        method: "DELETE",
        query: teamQuery,
      },
      {
        onSuccess: () => {
          toast.success("Prompt deleted");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreatePromptButtonClicked();
    }
  };

  const promptItems: Prompt[] = prompts.data ?? [];

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const prompt = find(promptItems, { _id: id });
    if (!prompt) return null;
    switch (action) {
      case "EDIT":
        openEditPromptDialog(prompt);
        break;
      case "DELETE":
        openDeletePromptDialog(prompt);
        break;
    }
  };

  const onSearchValueChanged = (searchValue: string) => {
    setSearchValue(searchValue);
  };

  const onPaginationChanged = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onFiltersValueChanged = (filterValue: FiltersValues) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

  return (
    <TeamPrompts
      prompts={promptItems}
      team={ctx.team}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={prompts.totalPages ?? 1}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing || prompts.isFetching}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
