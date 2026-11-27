import { useContext, useRef } from "react";
import { data, redirect, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import { isAnnotationType } from "~/modules/annotations/helpers/annotationTypes";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "~/modules/prompts/authorization";
import { promptsUrl } from "~/modules/prompts/helpers/promptUrls";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import { CodebookService } from "../codebook";
import type { Codebook as CodebookType } from "../codebooks.types";
import { CodebookVersionService } from "../codebookVersion";
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

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, entityId, payload = {} } = await request.json();

  const { version } = payload;

  const user = await requireAuth({ request });
  const codebook = await CodebookService.findOne({
    _id: entityId,
    team: params.teamId,
  });
  if (!codebook) {
    throw new Error("Codebook not found");
  }
  if (!CodebookAuthorization.canUpdate(user, codebook)) {
    throw new Error("You do not have permission to update this codebook.");
  }

  switch (intent) {
    case "CREATE_CODEBOOK_VERSION": {
      const previousVersionDocs = await CodebookVersionService.find({
        match: { codebook: entityId, version: Number(version) },
      });

      if (previousVersionDocs.length === 0) {
        return data(
          { errors: { general: "Previous codebook version not found" } },
          { status: 400 },
        );
      }

      const codebookVersion = await CodebookVersionService.createNextVersion(
        entityId,
        previousVersionDocs[0],
      );

      return data({
        success: true,
        intent: "CREATE_CODEBOOK_VERSION",
        data: codebookVersion,
      });
    }
    case "UPDATE_CODEBOOK": {
      const { name, description } = payload;
      if (typeof name !== "string" || !name.trim()) {
        return data(
          { errors: { general: "Codebook name is required" } },
          { status: 400 },
        );
      }

      const updated = await CodebookService.updateById(entityId, {
        name: name.trim(),
        description: description || "",
      });
      return data({
        success: true,
        intent: "UPDATE_CODEBOOK",
        data: updated,
      });
    }
    case "DELETE_CODEBOOK": {
      if (!CodebookAuthorization.canDelete(user, codebook)) {
        return data(
          {
            errors: {
              general: "You do not have permission to delete this codebook.",
            },
          },
          { status: 403 },
        );
      }

      await CodebookService.updateById(entityId, {
        deletedAt: new Date(),
      });

      return data({
        success: true,
        intent: "DELETE_CODEBOOK",
      });
    }
    case "CREATE_PROMPT_FROM_CODEBOOK": {
      const {
        codebookVersionId,
        annotationType,
        categoryIds,
        hasFlattenedCategories,
        flattenedAnnotationField,
      } = payload;

      if (!isAnnotationType(annotationType)) {
        return data(
          { errors: { annotationType: "Invalid annotation type" } },
          { status: 400 },
        );
      }

      if (!PromptAuthorization.canCreate(user, params.teamId)) {
        return data(
          {
            errors: {
              general:
                "You do not have permission to create prompts in this team.",
            },
          },
          { status: 403 },
        );
      }

      let prompt;
      try {
        prompt = await CodebookService.createPromptFromCodebook({
          codebookId: entityId,
          codebookVersionId,
          annotationType,
          categoryIds,
          hasFlattenedCategories,
          flattenedAnnotationField,
          userId: user._id,
          teamId: params.teamId,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return data({ errors: { general: errorMessage } }, { status: 500 });
      }

      trackServerEvent({ name: "prompt_created", userId: user._id });
      await createGeneralJob("TRACK_FIRST_PROMPT", { userId: user._id });

      return data({
        success: true,
        intent: "CREATE_PROMPT_FROM_CODEBOOK",
        data: prompt,
      });
    }
    default:
      return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }
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
