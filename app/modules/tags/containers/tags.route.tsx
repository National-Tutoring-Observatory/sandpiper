import { data, redirect, useFetcher, useLoaderData } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import TagAuthorization from "../authorization";
import EditTagDialog from "../components/editTagDialog";
import { TagService } from "../tag";
import type { Tag } from "../tags.types";
import type { Route } from "./+types/tags.route";
import TagsContainer from "./tags.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!TagAuthorization.canCreate(user, params.teamId)) {
    return redirect("/");
  }

  const queryParams = getQueryParamsFromRequest(request, {
    searchValue: "",
    currentPage: 1,
    sort: "name",
    filters: {},
  });

  const query = buildQueryFromParams({
    match: { team: params.teamId },
    queryParams,
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const tags = await TagService.paginate({ ...query });

  return { tags };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  if (!TagAuthorization.canCreate(user, params.teamId)) {
    return redirect("/");
  }

  const payload = await request.json();

  if (payload.intent === "CREATE_TAG") {
    const name = payload.tag?.name?.trim();
    if (!name) {
      return data({ errors: { name: "Name is required" } }, { status: 400 });
    }

    const tag = await TagService.create({
      name,
      description: payload.tag.description,
      color: payload.tag.color,
      team: params.teamId,
      createdBy: user._id,
    });

    return data({ success: true, intent: "CREATE_TAG", tag });
  }

  return data({ errors: { general: "Invalid intent" } }, { status: 400 });
}

const breadcrumbs: Breadcrumb[] = [{ text: "Tags" }];

export default function TagsRoute() {
  const { tags } = useLoaderData<typeof loader>();

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

  const fetcher = useFetcher();

  const onCreateTagClicked = (
    tag: Pick<Tag, "name" | "description" | "color">,
  ) => {
    fetcher.submit(JSON.stringify({ intent: "CREATE_TAG", tag }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const onCreateTagButtonClicked = () => {
    addDialog(
      <EditTagDialog
        tag={{ name: "", description: "", color: "#ff5567" }}
        onEditTagClicked={onCreateTagClicked}
      />,
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateTagButtonClicked();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    console.warn("Tag item action not yet implemented:", { id, action });
  };

  const onSearchValueChanged = (value: string) => {
    setSearchValue(value);
  };

  const onPaginationChanged = (page: number) => {
    setCurrentPage(page);
  };

  const onFiltersValueChanged = (
    filterValue: Record<string, string | null>,
  ) => {
    setFiltersValues({ ...filtersValues, ...filterValue });
  };

  const onSortValueChanged = (value: string) => {
    setSortValue(value);
  };

  return (
    <TagsContainer
      breadcrumbs={breadcrumbs}
      tags={tags.data}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={tags.totalPages}
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
