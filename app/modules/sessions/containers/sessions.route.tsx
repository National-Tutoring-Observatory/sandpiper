import type {
  SelectActionChange,
  SelectActionClose,
} from "@/components/ui/selectAll";
import find from "lodash/find";
import { useState } from "react";
import { redirect, useLoaderData, useSubmit } from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import ProjectAuthorization from "~/modules/projects/authorization";
import { ProjectService } from "~/modules/projects/project";
import ViewSessionContainer from "~/modules/sessions/containers/viewSessionContainer";
import { SessionService } from "~/modules/sessions/session";
import type { Session } from "~/modules/sessions/sessions.types";
import Sessions from "../components/sessions";
import createSessionsFromFiles from "../services/createSessionsFromFiles.server";
import type { Route } from "./+types/sessions.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project) {
    return redirect("/");
  }

  if (!ProjectAuthorization.canView(user, project)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { project: params.projectId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
    filterableFields: [],
  });

  const sessions = await SessionService.paginate(query);

  return { sessions, project };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: params.teamId,
  });
  if (!project || !ProjectAuthorization.canView(user, project)) {
    return redirect("/");
  }

  const { intent } = await request.json();

  switch (intent) {
    case "RE_RUN": {
      await createSessionsFromFiles({
        projectId: params.projectId,
        shouldCreateSessionModels: false,
      });

      return await ProjectService.updateById(params.projectId, {
        isConvertingFiles: true,
      });
    }
    default:
      return {};
  }
}

export default function ProjectSessionsRoute() {
  const { sessions, project } = useLoaderData<typeof loader>();
  const submit = useSubmit();

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

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const [selectActionsValues, setSelectActionsValues] = useState<{
    tag: string[];
  }>({ tag: [] });

  const onSelectChanged = (selectedItems: string[]) => {
    setSelectedItems(selectedItems);
  };

  const onSelectActionChanged = ({ action, value }: SelectActionChange) => {
    if (action === "tag") {
      setSelectActionsValues((current) => ({
        ...current,
        tag: current.tag.includes(value)
          ? current.tag.filter((id) => id !== value)
          : [...current.tag, value],
      }));
    }
  };

  const onSelectActionClosed = ({ action, value }: SelectActionClose) => {
    if (action === "tag") {
      console.log(value);
      setSelectActionsValues((current) => ({
        ...current,
        tag: [],
      }));
    }
  };

  const onSessionClicked = (session: Session) => {
    addDialog(<ViewSessionContainer session={session} />);
  };

  const onReRunClicked = () => {
    submit(
      JSON.stringify({
        intent: "RE_RUN",
        payload: {},
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "RE_RUN") {
      onReRunClicked();
    }
  };

  const onItemClicked = (id: string) => {
    const session = find(sessions.data, { _id: id });
    if (!session) return null;
    if (session.hasConverted) {
      onSessionClicked(session);
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

  return (
    <Sessions
      project={project}
      sessions={sessions.data}
      selectedItems={selectedItems}
      selectActionsValues={selectActionsValues}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={sessions.totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onSelectChanged={onSelectChanged}
      onSelectActionChanged={onSelectActionChanged}
      onSelectActionClosed={onSelectActionClosed}
      onItemClicked={onItemClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
