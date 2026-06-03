import find from "lodash/find";
import { useEffect } from "react";
import {
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
  useSubmit,
} from "react-router";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "~/modules/prompts/authorization";
import CreatePromptDialog from "~/modules/prompts/components/createPromptDialog";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import { usePromptActions } from "~/modules/prompts/hooks/usePromptActions";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import TeamAuthorization from "../authorization";
import TeamPrompts from "../components/teamPrompts";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teamPrompts.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TeamAuthorization.canView(user, params.teamId)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { team: params.teamId, deletedAt: { $exists: false } },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
    filterableFields: ["annotationType"],
  });

  const prompts = await PromptService.paginate(query);

  return { prompts };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, payload = {} } = await request.json();
  const { name, annotationType } = payload;

  const user = await requireAuth({ request });

  if (!PromptAuthorization.canCreate(user, params.teamId)) {
    throw new Error(
      "You do not have permission to create a prompt in this team.",
    );
  }

  if (intent === "CREATE_PROMPT") {
    if (typeof name !== "string")
      throw new Error("Prompt name is required and must be a string.");

    const prompt = await PromptService.create({
      name,
      annotationType,
      team: params.teamId,
      productionVersion: 1,
      createdBy: user._id,
    });
    await PromptVersionService.create({
      name: "initial",
      prompt: prompt._id,
      version: 1,
      annotationSchema: [
        {
          isSystem: true,
          fieldKey: "_id",
          fieldType: "string",
          value: "",
        },
        {
          isSystem: true,
          fieldKey: "identifiedBy",
          fieldType: "string",
          value: "AI",
        },
        {
          isSystem: true,
          fieldKey: "reasoning",
          fieldType: "string",
          value: "",
        },
      ],
    });

    trackServerEvent({ name: "prompt_created", userId: user._id });
    await createGeneralJob("TRACK_FIRST_PROMPT", { userId: user._id });

    return {
      intent: "CREATE_PROMPT",
      data: prompt,
    };
  }

  return {};
}

export default function TeamPromptsRoute() {
  const data = useLoaderData<typeof loader>();
  const ctx = useOutletContext<{ team: Team }>();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const params = useParams();
  const teamId = params.teamId;
  const [searchParams, setSearchParams] = useSearchParams();

  const { openEditPromptDialog, openDeletePromptDialog } = usePromptActions();

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

  useEffect(() => {
    if (actionData?.intent === "CREATE_PROMPT") {
      navigate(
        promptsUrl(
          teamId!,
          actionData.data._id,
          actionData.data.productionVersion,
        ),
      );
    }
  }, [actionData, navigate, teamId]);

  const onCreatePromptButtonClicked = () => {
    addDialog(
      <CreatePromptDialog
        hasTeamSelection={false}
        onCreateNewPromptClicked={onCreateNewPromptClicked}
      />,
    );
  };

  useEffect(() => {
    if (searchParams.get("create") !== "1") return;
    onCreatePromptButtonClicked();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("create");
        return next;
      },
      { replace: true },
    );
     
  }, []);

  const onCreateNewPromptClicked = ({
    name,
    annotationType,
  }: {
    name: string;
    annotationType: string;
  }) => {
    submit(
      JSON.stringify({
        intent: "CREATE_PROMPT",
        payload: { name, annotationType },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreatePromptButtonClicked();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const prompt = find(data.prompts.data, { _id: id });
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

  const onFiltersValueChanged = (
    filterValue: Record<string, string | null>,
  ) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

  const prompts = data.prompts.data ?? [];

  return (
    <TeamPrompts
      prompts={prompts}
      team={ctx.team}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={data.prompts.totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
