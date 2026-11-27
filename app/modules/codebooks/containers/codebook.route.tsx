import { useContext, useRef } from "react";
import { redirect, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import addDialog from "~/modules/dialogs/addDialog";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import { CodebookService } from "../codebook";
import type { Codebook as CodebookType } from "../codebooks.types";
import Codebook from "../components/codebook";
import DeleteCodebookDialog from "../components/deleteCodebookDialog";
import EditCodebookDialog from "../components/editCodebookDialog";
import { codebookUrl, codebooksUrl } from "../helpers/codebookUrls";
import type { Route } from "./+types/codebook.route";
import CreatePromptFromCodebookDialogContainer from "./createPromptFromCodebookDialog.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const codebook = await CodebookService.findOne({
    _id: params.codebookId,
    team: params.teamId,
  });
  if (!codebook) {
    return redirect(codebooksUrl(params.teamId));
  }
  if (!CodebookAuthorization.canView(user, codebook)) {
    throw new Error("You do not have permission to view this codebook.");
  }
  return {};
}

export default function CodebookRoute({ params }: Route.ComponentProps) {
  const { teamId, codebookId } = params;
  const { version } = useParams();
  const navigate = useNavigate();
  const user = useContext(AuthenticationContext);
  const createPromptToastId = useRef<string | number | undefined>(undefined);

  const teamQuery = { teamId };
  const codebook = useCache({
    api: `/api/codebooks/${codebookId}`,
    query: teamQuery,
  });
  const codebookVersions = useCache({
    api: `/api/codebooks/${codebookId}/versions`,
    query: teamQuery,
  });

  if (!codebook.data || !codebookVersions.data) return null;

  const openEditCodebookDialog = (codebook: CodebookType) => {
    addDialog(
      <EditCodebookDialog
        codebook={codebook}
        onEditCodebookClicked={submitEditCodebook}
      />,
    );
  };

  const submitEditCodebook = ({ name, description }: CodebookType) => {
    codebook.mutate(
      { method: "PUT", query: teamQuery, data: { name, description } },
      {
        onSuccess: () => {
          toast.success("Codebook updated");
          addDialog(null);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openDeleteCodebookDialog = (codebook: CodebookType) => {
    addDialog(
      <DeleteCodebookDialog
        codebook={codebook}
        onDeleteCodebookClicked={submitDeleteCodebook}
      />,
    );
  };

  const submitDeleteCodebook = () => {
    codebook.mutate(
      { method: "DELETE", query: teamQuery },
      {
        onSuccess: () => {
          toast.success("Codebook deleted");
          addDialog(null);
          navigate(codebooksUrl(teamId));
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const submitCreateCodebookVersion = () => {
    codebookVersions.mutate(
      { method: "POST", query: teamQuery, data: { version: Number(version) } },
      {
        onSuccess: (response) =>
          navigate(codebookUrl(teamId, codebookId, response.data.version)),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const openCreatePromptFromCodebookDialog = () => {
    addDialog(
      <CreatePromptFromCodebookDialogContainer
        codebookVersions={codebookVersions.data}
        productionVersion={codebook.data.productionVersion}
        onCreatePromptClicked={submitCreatePromptFromCodebook}
        isSubmitting={codebook.isMutating}
      />,
    );
  };

  const submitCreatePromptFromCodebook = (options: {
    codebookVersionId: string;
    annotationType: string;
  }) => {
    createPromptToastId.current = toast.loading(
      "Creating prompt from codebook...",
    );
    codebook.mutate(
      {
        api: `/api/codebooks/${codebookId}/prompts`,
        method: "POST",
        query: teamQuery,
        data: options,
      },
      {
        onSuccess: (response) => {
          toast.dismiss(createPromptToastId.current);
          toast.success("Prompt created from codebook");
          addDialog(null);
          navigate(
            promptsUrl(
              teamId,
              response.data._id,
              response.data.productionVersion,
            ),
          );
        },
        onError: (error) => {
          toast.dismiss(createPromptToastId.current);
          toast.error(error.message);
        },
      },
    );
  };

  const breadcrumbs = [
    { text: "Codebooks", link: codebooksUrl(teamId) },
    { text: codebook.data.name },
  ];

  return (
    <Codebook
      codebook={codebook.data}
      codebookVersions={codebookVersions.data}
      version={Number(version)}
      breadcrumbs={breadcrumbs}
      canDelete={CodebookAuthorization.canDelete(user, codebook.data)}
      onCreateCodebookVersionClicked={submitCreateCodebookVersion}
      onEditCodebookButtonClicked={openEditCodebookDialog}
      onDeleteCodebookButtonClicked={openDeleteCodebookDialog}
      onCreatePromptFromCodebookClicked={openCreatePromptFromCodebookDialog}
    />
  );
}
