import { useEffect, useRef } from "react";
import {
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "react-router";
import { toast } from "sonner";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import { isAnnotationType } from "~/modules/annotations/helpers/annotationTypes";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import CodebookAuthorization from "~/modules/codebooks/authorization";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "~/modules/prompts/authorization";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import { CodebookService } from "../codebook";
import type { Codebook as CodebookType } from "../codebooks.types";
import { CodebookVersionService } from "../codebookVersion";
import Codebook from "../components/codebook";
import EditCodebookDialog from "../components/editCodebookDialog";
import type { Route } from "./+types/codebook.route";
import CreatePromptFromCodebookDialogContainer from "./createPromptFromCodebookDialog.container";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const codebook = await CodebookService.findById(params.id);
  if (!codebook) {
    return redirect("/codebooks");
  }
  if (!CodebookAuthorization.canView(user, codebook)) {
    throw new Error("You do not have permission to view this codebook.");
  }
  const codebookVersions = await CodebookVersionService.find({
    match: { codebook: params.id },
    sort: { version: -1 },
  });
  return { codebook, codebookVersions };
}

export async function action({ request }: Route.ActionArgs) {
  const { intent, entityId, payload = {} } = await request.json();

  const { version } = payload;

  const user = await requireAuth({ request });
  const codebook = await CodebookService.findById(entityId);
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

      if (!PromptAuthorization.canCreate(user, codebook.team as string)) {
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
          teamId: codebook.team as string,
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

export default function CodebookRoute() {
  const loaderData = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const { id, version } = useParams();

  const fetcher = useFetcher();
  const createPromptToastId = useRef<string | number | undefined>(undefined);

  const { codebook, codebookVersions } = loaderData;

  const submitCreateCodebookVersion = () => {
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_CODEBOOK_VERSION",
        entityId: id,
        payload: { version },
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) {
      if (
        fetcher.data.success &&
        fetcher.data.intent === "CREATE_PROMPT_FROM_CODEBOOK"
      ) {
        toast.dismiss(createPromptToastId.current);
        toast.success("Prompt created from codebook");
        addDialog(null);
        navigate(
          `/teams/${codebook.team}/prompts/${fetcher.data.data._id}/${fetcher.data.data.productionVersion}`,
        );
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "CREATE_CODEBOOK_VERSION"
      ) {
        navigate(
          `/codebooks/${fetcher.data.data.codebook}/${fetcher.data.data.version}`,
        );
      } else if (
        fetcher.data.success &&
        fetcher.data.intent === "UPDATE_CODEBOOK"
      ) {
        toast.success("Codebook updated");
        addDialog(null);
      } else if (fetcher.data.errors) {
        toast.dismiss(createPromptToastId.current);
        toast.error(fetcher.data.errors.general || "An error occurred");
      }
    }
  }, [fetcher.state, fetcher.data, navigate]);

  const breadcrumbs = [
    {
      text: "Codebooks",
      link: "/codebooks",
    },
    {
      text: codebook.name,
    },
  ];

  const openCreatePromptFromCodebookDialog = () => {
    addDialog(
      <CreatePromptFromCodebookDialogContainer
        codebookVersions={codebookVersions}
        productionVersion={codebook.productionVersion}
        onCreatePromptClicked={submitCreatePromptFromCodebook}
        isSubmitting={fetcher.state === "submitting"}
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
    fetcher.submit(
      JSON.stringify({
        intent: "CREATE_PROMPT_FROM_CODEBOOK",
        entityId: id,
        payload: options,
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const openEditCodebookDialog = (c: CodebookType) => {
    addDialog(
      <EditCodebookDialog
        codebook={c}
        onEditCodebookClicked={submitEditCodebook}
        isSubmitting={fetcher.state === "submitting"}
      />,
    );
  };

  const submitEditCodebook = (updatedCodebook: CodebookType) => {
    fetcher.submit(
      JSON.stringify({
        intent: "UPDATE_CODEBOOK",
        entityId: updatedCodebook._id,
        payload: {
          name: updatedCodebook.name,
          description: updatedCodebook.description,
        },
      }),
      { method: "PUT", encType: "application/json" },
    );
  };

  return (
    <Codebook
      codebook={codebook}
      codebookVersions={codebookVersions}
      version={Number(version)}
      breadcrumbs={breadcrumbs}
      onCreateCodebookVersionClicked={submitCreateCodebookVersion}
      onEditCodebookButtonClicked={openEditCodebookDialog}
      onCreatePromptFromCodebookClicked={openCreatePromptFromCodebookDialog}
    />
  );
}
