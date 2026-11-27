import find from "lodash/find";
import { useEffect } from "react";
import {
  data,
  redirect,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router";
import { toast } from "sonner";
import { useSearchQueryParams } from "~/modules/app/hooks/useSearchQueryParams";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import { CodebookService } from "~/modules/codebooks/codebook";
import type { Codebook } from "~/modules/codebooks/codebooks.types";
import { CodebookVersionService } from "~/modules/codebooks/codebookVersion";
import CreateCodebookDialog from "~/modules/codebooks/components/createCodebookDialog";
import DeleteCodebookDialog from "~/modules/codebooks/components/deleteCodebookDialog";
import EditCodebookDialog from "~/modules/codebooks/components/editCodebookDialog";
import {
  CODEBOOKS_CREATE_PARAM,
  codebookUrl,
} from "~/modules/codebooks/helpers/codebookUrls";
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

  return {};
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

export default function TeamCodebooksRoute({ params }: Route.ComponentProps) {
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
    isSyncing,
  } = useSearchQueryParams({
    searchValue: "",
    currentPage: 1,
    sortValue: "name",
    filters: {},
  });

  const teamQuery = { teamId };
  const debouncedSearchValue = searchParams.get("searchValue") || undefined;

  const codebooks = useCache({
    api: "/api/codebooks",
    query: {
      ...teamQuery,
      currentPage,
      searchValue: debouncedSearchValue,
      sort: sortValue || undefined,
    },
  });

  const openEditCodebookDialog = (codebook: Codebook) => {
    addDialog(
      <EditCodebookDialog
        codebook={codebook}
        onEditCodebookClicked={submitEditCodebook}
      />,
    );
  };

  const submitEditCodebook = (codebook: Codebook) => {
    codebooks.mutate(
      {
        api: `/api/codebooks/${codebook._id}`,
        method: "PUT",
        query: teamQuery,
        data: { name: codebook.name, description: codebook.description },
      },
      {
        onSuccess: () => {
          toast.success("Codebook updated");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openDeleteCodebookDialog = (codebook: Codebook) => {
    addDialog(
      <DeleteCodebookDialog
        codebook={codebook}
        onDeleteCodebookClicked={() => submitDeleteCodebook(codebook)}
      />,
    );
  };

  const submitDeleteCodebook = (codebook: Codebook) => {
    codebooks.mutate(
      {
        api: `/api/codebooks/${codebook._id}`,
        method: "DELETE",
        query: teamQuery,
      },
      {
        onSuccess: () => {
          toast.success("Codebook deleted");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const onCreateCodebookButtonClicked = () => {
    addDialog(
      <CreateCodebookDialog
        onCreateNewCodebookClicked={submitCreateCodebook}
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

  const submitCreateCodebook = ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => {
    codebooks.mutate(
      { method: "POST", query: teamQuery, data: { name, description } },
      {
        onSuccess: (response) =>
          navigate(
            codebookUrl(
              teamId,
              response.data._id,
              response.data.productionVersion,
            ),
          ),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const onActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateCodebookButtonClicked();
    }
  };

  const codebookItems: Codebook[] = codebooks.data ?? [];

  const onItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const codebook = find(codebookItems, { _id: id });
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

  return (
    <TeamCodebooks
      codebooks={codebookItems}
      team={ctx.team}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={codebooks.totalPages ?? 1}
      sortValue={sortValue}
      isSyncing={isSyncing || codebooks.isFetching}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={setSearchValue}
      onPaginationChanged={setCurrentPage}
      onSortValueChanged={setSortValue}
    />
  );
}
