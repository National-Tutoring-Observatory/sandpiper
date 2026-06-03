import find from "lodash/find";
import { useEffect } from "react";
import {
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
  useSubmit,
} from "react-router";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import getQueryParamsFromRequest from "~/modules/app/helpers/getQueryParamsFromRequest.server";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import { CodebookService } from "~/modules/codebooks/codebook";
import { CodebookVersionService } from "~/modules/codebooks/codebookVersion";
import CreateCodebookDialog from "~/modules/codebooks/components/createCodebookDialog";
import {
  CODEBOOKS_CREATE_PARAM,
  codebookUrl,
} from "~/modules/codebooks/helpers/codebookUrls";
import { useCodebookActions } from "~/modules/codebooks/hooks/useCodebookActions";
import addDialog from "~/modules/dialogs/addDialog";
import TeamAuthorization from "../authorization";
import TeamCodebooks from "../components/teamCodebooks";
import type { Team } from "../teams.types";
import type { Route } from "./+types/teamCodebooks.route";

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
  });

  const codebooks = await CodebookService.paginate(query);

  return { codebooks };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, payload = {} } = await request.json();
  const { name, description } = payload;

  const user = await requireAuth({ request });

  if (!CodebookAuthorization.canCreate(user, params.teamId)) {
    return data(
      {
        errors: {
          general:
            "You do not have permission to create codebooks in this team.",
        },
      },
      { status: 403 },
    );
  }

  if (intent === "CREATE_CODEBOOK") {
    if (typeof name !== "string") {
      return data(
        {
          errors: {
            general: "Codebook name is required and must be a string.",
          },
        },
        { status: 400 },
      );
    }

    const codebook = await CodebookService.create({
      name,
      description: description || "",
      team: params.teamId,
      productionVersion: 1,
      createdBy: user._id,
    });

    await CodebookVersionService.create({
      name: "initial",
      codebook: codebook._id,
      version: 1,
      categories: [
        { name: "New category", description: "", codes: [] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    });

    return {
      intent: "CREATE_CODEBOOK",
      data: codebook,
    };
  }

  return {};
}

export default function TeamCodebooksRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const ctx = useOutletContext<{ team: Team }>();
  const actionData = useActionData();
  const submit = useSubmit();
  const navigate = useNavigate();
  const params = useParams();
  const teamId = params.teamId;
  const [searchParams, setSearchParams] = useSearchParams();

  const { openEditCodebookDialog, openDeleteCodebookDialog } =
    useCodebookActions();

  const {
    searchValue,
    setSearchValue,
    currentPage,
    setCurrentPage,
    sortValue,
    setSortValue,
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "name",
    filters: {},
  });

  useEffect(() => {
    if (actionData?.intent === "CREATE_CODEBOOK") {
      navigate(
        codebookUrl(
          teamId!,
          actionData.data._id,
          actionData.data.productionVersion,
        ),
      );
    }
  }, [actionData, navigate, teamId]);

  const onCreateCodebookButtonClicked = () => {
    addDialog(
      <CreateCodebookDialog
        onCreateNewCodebookClicked={onCreateNewCodebookClicked}
      />,
    );
  };

  useEffect(() => {
    if (searchParams.get(CODEBOOKS_CREATE_PARAM) !== "1") return;
    onCreateCodebookButtonClicked();
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete(CODEBOOKS_CREATE_PARAM);
        return next;
      },
      { replace: true },
    );
  }, [searchParams, setSearchParams]);

  const onCreateNewCodebookClicked = ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    submit(
      JSON.stringify({
        intent: "CREATE_CODEBOOK",
        payload: { name, description },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateCodebookButtonClicked();
    }
  };

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const codebook = find(loaderData.codebooks.data, { _id: id });
    if (!codebook) return null;
    switch (action) {
      case "EDIT":
        openEditCodebookDialog(codebook);
        break;
      case "DELETE":
        openDeleteCodebookDialog(codebook);
        break;
    }
  };

  const onSearchValueChanged = (searchValue: string) => {
    setSearchValue(searchValue);
  };

  const onPaginationChanged = (currentPage: number) => {
    setCurrentPage(currentPage);
  };

  const onSortValueChanged = (sortValue: string) => {
    setSortValue(sortValue);
  };

  const codebooks = loaderData.codebooks.data ?? [];

  return (
    <TeamCodebooks
      codebooks={codebooks}
      team={ctx.team}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={loaderData.codebooks.totalPages}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
}
