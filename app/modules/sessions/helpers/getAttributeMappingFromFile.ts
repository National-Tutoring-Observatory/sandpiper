import each from "lodash/each";
import has from "lodash/has";
import handleLLMError from "~/modules/llm/helpers/handleLLMError";
import LLM from "~/modules/llm/llm";
import { getDefaultModelCode } from "~/modules/llm/modelRegistry";
import leadRolePrompt from "../prompts/leadRole.prompt.json";

const REQUIRED_ATTRIBUTES = {
  session_id: { alternatives: ["sessionId", "sessionID"] },
  role: { alternatives: ["speaker"] },
  content: { alternatives: ["text"] },
  sequence_id: { alternatives: ["sequenceId", "sequenceID"] },
};

export default async function getAttributeMappingFromFile({
  file,
  team,
  projectId,
  userId,
}: {
  file: File;
  team: string;
  projectId?: string;
  userId: string;
}): Promise<Record<string, string>> {
  const fileContents = await file.text();

  const fileContentsAsJSON = JSON.parse(fileContents);

  const firstUtterance = fileContentsAsJSON[0];

  const attributeMapping: Record<string, string> = {};

  if (firstUtterance) {
    each(REQUIRED_ATTRIBUTES, (requiredAttribute, requiredAttributeKey) => {
      if (has(firstUtterance, requiredAttributeKey)) {
        attributeMapping[requiredAttributeKey] = requiredAttributeKey;
      } else {
        each(requiredAttribute.alternatives, (alternative) => {
          if (attributeMapping[requiredAttributeKey]) return;
          if (has(firstUtterance, alternative)) {
            attributeMapping[requiredAttributeKey] = alternative;
          }
        });
      }
    });
  }

  const roleKey = attributeMapping.role ?? "role";
  const uniqueRoles = [
    ...new Set(
      fileContentsAsJSON.map(
        (utterance: Record<string, string>) => utterance[roleKey],
      ),
    ),
  ];

  try {
    const llm = new LLM({
      model: getDefaultModelCode(),
      team,
      userId,
      source: "attribute-mapping",
      sourceId: projectId,
      billingEventId: `attribute-mapping:${projectId ?? "no-project"}`,
    });

    llm.addSystemMessage(leadRolePrompt.system, {});

    llm.addUserMessage(leadRolePrompt.user, {
      roles: uniqueRoles.join(" | "),
    });

    const response = await llm.createChat();

    attributeMapping.leadRole = response.leadRole;
  } catch (error) {
    const errorMessage = handleLLMError(error);
    throw new Error(errorMessage, { cause: error });
  }

  return attributeMapping;
}
