import { data } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import PromptAuthorization from "../authorization";
import checkPromptAndAnnotationSchemaAlignment from "../services/checkPromptAndAnnotationSchemaAlignment.server";
import suggestPromptAndAnnotationSchemaChanges from "../services/suggestPromptAndAnnotationSchemaChanges.server";
import type { Route } from "./+types/promptVersionAlignment.route";

export async function action({ request }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const {
    intent,
    userPrompt,
    annotationSchema,
    team,
    promptId,
    alignmentScore,
    reasoning,
  } = await request.json();

  if (!PromptAuthorization.canCreate(user, team)) {
    throw new Error("Access denied");
  }

  switch (intent) {
    case "ALIGNMENT_CHECK": {
      try {
        const response = await checkPromptAndAnnotationSchemaAlignment({
          userPrompt,
          annotationSchema,
          team,
          promptId,
          userId: user._id,
        });
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to check alignment";
        return data({ errors: { general: message } }, { status: 500 });
      }
    }
    case "SUGGEST_CHANGES": {
      try {
        const response = await suggestPromptAndAnnotationSchemaChanges({
          userPrompt,
          annotationSchema,
          team,
          promptId,
          alignmentScore,
          reasoning,
          userId: user._id,
        });
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to suggest changes";
        return data({ errors: { general: message } }, { status: 500 });
      }
    }
  }

  return data({ errors: { general: "Invalid intent" } }, { status: 400 });
}
