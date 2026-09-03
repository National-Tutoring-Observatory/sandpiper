import find from "lodash/find";
import { data, redirect, useFetcher, useLoaderData } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import addDialog from "~/modules/dialogs/addDialog";
import TagAuthorization from "../authorization";
import DeleteTagDialog from "../components/deleteTagDialog";
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
    const newTag = payload.data;
    const name = newTag?.name?.trim();
    if (!name) {
      return data({ errors: { name: "Name is required" } }, { status: 400 });
    }

    const tag = await TagService.create({
      name,
      description: newTag.description,
      color: newTag.color,
      team: params.teamId,
      createdBy: user._id,
    });

    return data({ success: true, intent: "CREATE_TAG", tag });
  }

  if (payload.intent === "UPDATE_TAG") {
    const updates = payload.data;
    const name = updates?.name?.trim();
    if (!name) {
      return data({ errors: { name: "Name is required" } }, { status: 400 });
    }

    const existingTag = await TagService.findOne({
      _id: payload.entityId,
      team: params.teamId,
    });
    if (!existingTag) {
      return data({ errors: { general: "Tag not found" } }, { status: 404 });
    }

    const tag = await TagService.updateById(existingTag._id, {
      name,
      description: updates.description,
      color: updates.color,
      updatedBy: user._id,
      updatedAt: new Date(),
    });

    return data({ success: true, intent: "UPDATE_TAG", tag });
  }

  if (payload.intent === "DELETE_TAG") {
    const existingTag = await TagService.findOne({
      _id: payload.entityId,
      team: params.teamId,
    });
    if (!existingTag) {
      return data({ errors: { general: "Tag not found" } }, { status: 404 });
    }

    await TagService.deleteById(existingTag._id);

    return data({ success: true, intent: "DELETE_TAG" });
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

  const createTag = (data: Pick<Tag, "name" | "description" | "color">) => {
    fetcher.submit(JSON.stringify({ intent: "CREATE_TAG", data }), {
      method: "POST",
      encType: "application/json",
    });
  };

  const updateTag = (
    entityId: string,
    data: Pick<Tag, "name" | "description" | "color">,
  ) => {
    fetcher.submit(JSON.stringify({ intent: "UPDATE_TAG", entityId, data }), {
      method: "PUT",
      encType: "application/json",
    });
  };

  const openCreateTagDialog = () => {
    addDialog(
      <EditTagDialog
        tag={{ name: "", description: "", color: "#ff5567" }}
        onEditTagClicked={createTag}
      />,
    );
  };

  const deleteTag = (entityId: string) => {
    fetcher.submit(JSON.stringify({ intent: "DELETE_TAG", entityId }), {
      method: "DELETE",
      encType: "application/json",
    });
  };

  const openEditTagDialog = (tag: Tag) => {
    addDialog(
      <EditTagDialog
        tag={tag}
        onEditTagClicked={(updatedTag) => updateTag(tag._id, updatedTag)}
      />,
    );
  };

  const openDeleteTagDialog = (tag: Tag) => {
    addDialog(
      <DeleteTagDialog
        tag={tag}
        onDeleteTagClicked={() => deleteTag(tag._id)}
      />,
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      openCreateTagDialog();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const tag = find(tags.data, { _id: id });
    if (!tag) return;

    if (action === "EDIT") {
      openEditTagDialog(tag);
    }

    if (action === "DELETE") {
      openDeleteTagDialog(tag);
    }
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
      isSyncing={isSyncing || fetcher.state !== "idle"}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
