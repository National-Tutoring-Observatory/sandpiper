import { useState } from "react";
import {
  redirect,
  useLoaderData,
  useNavigation,
  useSubmit,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { CodebookService } from "~/modules/codebooks/codebook";
import { CodebookVersionService } from "~/modules/codebooks/codebookVersion";
import addDialog from "~/modules/dialogs/addDialog";
import PromptAuthorization from "../authorization";
import PromptEditor from "../components/promptEditor";
import { SYSTEM_FIELDS } from "../helpers/defaultPrompts";
import getSystemPrompt from "../helpers/getSystemPrompt";
import tokenizePromptVersion from "../helpers/tokenizePromptVersion";
import { PromptService } from "../prompt";
import type { AnnotationSchemaItem } from "../prompts.types";
import { PromptVersionService } from "../promptVersion";
import type { Route } from "./+types/promptEditor.route";
import SavePromptVersionDialogContainer from "./savePromptVersionDialogContainer";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });

  const prompt = await PromptService.findById(params.id);

  if (!prompt) {
    return redirect("/");
  }

  if (!PromptAuthorization.canView(user, prompt)) {
    return redirect("/");
  }

  const promptVersion = await PromptVersionService.findOne({
    version: Number(params.version),
    prompt: params.id,
  });

  if (!promptVersion) {
    return redirect("/");
  }

  let codebookData: { _id: string; name: string; version: number } | null =
    null;

  if (promptVersion.codebook) {
    const [codebook, codebookVersion] = await Promise.all([
      CodebookService.findById(promptVersion.codebook),
      CodebookVersionService.findById(promptVersion.codebookVersion),
    ]);
    if (codebook && codebookVersion) {
      codebookData = {
        _id: codebook._id,
        name: codebook.name,
        version: codebookVersion.version,
      };
    }
  }

  return {
    prompt: { data: prompt },
    promptVersion: { data: promptVersion },
    codebook: codebookData,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { intent, entityId, payload = {} } = await request.json();

  const { name, userPrompt, annotationSchema } = payload;

  const user = await requireAuth({ request });

  const promptVersion = await PromptVersionService.findById(entityId);

  if (!promptVersion) {
    throw new Error("Prompt version not found");
  }

  const promptId =
    typeof promptVersion.prompt === "string"
      ? promptVersion.prompt
      : promptVersion.prompt._id;
  const prompt = await PromptService.findById(promptId);

  if (!prompt) {
    throw new Error("Prompt not found");
  }

  if (!PromptAuthorization.canUpdate(user, prompt)) {
    throw new Error("Access denied");
  }

  switch (intent) {
    case "UPDATE_PROMPT_VERSION": {
      const validatedSchema = [...annotationSchema];
      for (const systemField of [...SYSTEM_FIELDS].reverse()) {
        const exists = validatedSchema.some(
          (field) =>
            field.isSystem === true && field.fieldKey === systemField.fieldKey,
        );
        if (!exists) {
          validatedSchema.unshift(systemField);
        }
      }

      const inputTokens = tokenizePromptVersion(userPrompt, validatedSchema);
      await PromptVersionService.updateById(entityId, {
        name,
        userPrompt,
        annotationSchema: validatedSchema,
        hasBeenSaved: true,
        inputTokens,
        updatedAt: new Date().toISOString(),
      });
      return {};
    }
    case "MAKE_PROMPT_VERSION_PRODUCTION":
      await PromptService.updateById(promptId, {
        productionVersion: Number(params.version),
      });
      return {};
    default:
      return {};
  }
}

export function shouldRevalidate({
  formMethod,
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formMethod === "POST" && formAction === "/api/promptVersionAlignment") {
    return false;
  }
  return defaultShouldRevalidate;
}

export default function PromptEditorRoute() {
  const data = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const [isSystemPromptVisible, setIsSystemPromptVisible] = useState(false);

  const { prompt, promptVersion, codebook } = data;

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
        team={prompt.data.team as string}
        promptId={prompt.data._id}
        onSaveClicked={() => {
          submit(
            JSON.stringify({
              intent: "UPDATE_PROMPT_VERSION",
              entityId: promptVersion.data._id,
              payload: { name, userPrompt, annotationSchema },
            }),
            { method: "PUT", encType: "application/json" },
          );
        }}
        onAcceptChangesClicked={({
          suggestedPrompt,
          suggestedAnnotationSchema,
        }) => {
          submit(
            JSON.stringify({
              intent: "UPDATE_PROMPT_VERSION",
              entityId: promptVersion.data._id,
              payload: {
                name,
                userPrompt: suggestedPrompt,
                annotationSchema: suggestedAnnotationSchema,
              },
            }),
            { method: "PUT", encType: "application/json" },
          );
        }}
      />,
    );
  };

  const onMakePromptVersionProduction = () => {
    submit(
      JSON.stringify({
        intent: "MAKE_PROMPT_VERSION_PRODUCTION",
        entityId: promptVersion.data._id,
        payload: {},
      }),
      { method: "POST", encType: "application/json" },
    );
  };

  const onToggleSystemPromptClicked = () => {
    setIsSystemPromptVisible(!isSystemPromptVisible);
  };

  const systemPrompt = getSystemPrompt(
    "annotation",
    prompt.data.annotationType,
  );

  return (
    <PromptEditor
      key={`${promptVersion.data._id}-${promptVersion.data.updatedAt}`}
      promptVersion={promptVersion.data}
      systemPrompt={systemPrompt}
      codebook={codebook}
      isLoading={navigation.state === "loading"}
      onSavePromptVersion={onSavePromptVersion}
      isProduction={
        prompt.data.productionVersion === promptVersion.data.version
      }
      isSystemPromptVisible={isSystemPromptVisible}
      onMakePromptVersionProduction={onMakePromptVersionProduction}
      onToggleSystemPromptClicked={onToggleSystemPromptClicked}
    />
  );
}
