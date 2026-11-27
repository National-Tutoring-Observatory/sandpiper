import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { redirect } from "react-router";
import { toast } from "sonner";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import useCache from "~/modules/cache/hooks/useCache";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "../authorization";
import PromoteProductionVersionDialog from "../components/promoteProductionVersionDialog";
import PromptEditor from "../components/promptEditor";
import { PromptService } from "../prompt";
import type { AnnotationSchemaItem } from "../prompts.types";
import { PromptVersionService } from "../promptVersion";
import type { Route } from "./+types/promptEditor.route";
import SavePromptVersionDialogContainer from "./savePromptVersionDialogContainer";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const prompt = await PromptService.findOne({
    _id: params.promptId,
    team: params.teamId,
  });

  if (!prompt) {
    return redirect("/");
  }

  if (!PromptAuthorization.canView(user, prompt)) {
    return redirect("/");
  }

  const promptVersion = await PromptVersionService.findOne({
    version: Number(params.version),
    prompt: params.promptId,
  });

  if (!promptVersion) {
    return redirect("/");
  }

  return {};
}

export default function PromptEditorRoute({ params }: Route.ComponentProps) {
  const { teamId, promptId, version } = params;
  const queryClient = useQueryClient();
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);

  const teamQuery = { teamId };
  const promptVersionsApi = `/api/prompts/${promptId}/versions`;
  const prompt = useCache({
    api: `/api/prompts/${promptId}`,
    query: teamQuery,
  });
  const promptVersion = useCache({
    api: `${promptVersionsApi}/${version}`,
    query: teamQuery,
  });

  if (!prompt.data || !promptVersion.data) return null;

  const submitSavePromptVersion = (data: {
    name: string;
    userPrompt: string;
    annotationSchema: AnnotationSchemaItem[];
  }) => {
    promptVersion.mutate(
      { method: "PUT", query: teamQuery, data },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({ queryKey: [promptVersionsApi] }),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const onSavePromptVersion = ({
    name,
    userPrompt,
    annotationSchema,
  }: {
    name: string;
    userPrompt: string;
    annotationSchema: AnnotationSchemaItem[];
  }) => {
    addDialog(
      <SavePromptVersionDialogContainer
        userPrompt={userPrompt}
        annotationSchema={annotationSchema}
        teamId={teamId}
        promptId={promptId}
        onSaveClicked={() =>
          submitSavePromptVersion({ name, userPrompt, annotationSchema })
        }
        onAcceptChangesClicked={({
          suggestedPrompt,
          suggestedAnnotationSchema,
        }) =>
          submitSavePromptVersion({
            name,
            userPrompt: suggestedPrompt,
            annotationSchema: suggestedAnnotationSchema,
          })
        }
      />,
    );
  };

  const submitMakePromptVersionProduction = () => {
    prompt.mutate(
      {
        api: `${promptVersionsApi}/${version}/production`,
        method: "POST",
        query: teamQuery,
      },
      { onError: (error) => toast.error(error.message) },
    );
  };

  const onMakePromptVersionProduction = () => {
    addDialog(
      <PromoteProductionVersionDialog
        prompt={prompt.data}
        targetVersion={promptVersion.data.version}
        onConfirmClicked={submitMakePromptVersionProduction}
      />,
    );
  };

  const onToggleSystemPromptClicked = () => {
    setIsSystemPromptVisible(!isSystemPromptVisible);
  };

  const { linkedCodebook, systemPrompt, ...promptVersionData } =
    promptVersion.data;

  return (
    <PromptEditor
      key={`${promptVersionData._id}-${promptVersionData.updatedAt}`}
      promptVersion={promptVersionData}
      systemPrompt={systemPrompt}
      codebook={linkedCodebook}
      isLoading={promptVersion.isFetching || promptVersion.isMutating}
      onSavePromptVersion={onSavePromptVersion}
      isProduction={prompt.data.productionVersion === promptVersionData.version}
      isSystemPromptVisible={isSystemPromptVisible}
      onMakePromptVersionProduction={onMakePromptVersionProduction}
      onToggleSystemPromptClicked={onToggleSystemPromptClicked}
    />
  );
}
