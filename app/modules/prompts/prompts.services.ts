import { isValidObjectId } from "mongoose";
import getReferenceId from "~/helpers/getReferenceId";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import { CodebookService } from "~/modules/codebooks/codebook";
import { CodebookVersionService } from "~/modules/codebooks/codebookVersion";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import { RunService } from "~/modules/runs/run";
import type { ControllerContext } from "../api/api.types";
import type { User } from "../users/users.types";
import PromptAuthorization from "./authorization";
import { PromptPublishedError } from "./errors/promptPublishedError";
import { PublishError } from "./errors/publishError";
import { cleanAuthors, cleanPaperRefs } from "./helpers/cleanLibraryMetadata";
import { SYSTEM_FIELDS } from "./helpers/defaultPrompts";
import getSystemPrompt from "./helpers/getSystemPrompt.server";
import tokenizePromptVersion from "./helpers/tokenizePromptVersion";
import { PromptService } from "./prompt";
import PromptLibraryAuthorization from "./promptLibraryAuthorization";
import type {
  AnnotationSchemaItem,
  CheckPromptAlignmentInput,
  CreatePromptInput,
  GetPromptsByActiveTeamInput,
  GetPromptVersionsInput,
  GetSavedPromptsInput,
  PromptIdInput,
  PromptVersionInput,
  PublishPromptInput,
  SuggestPromptChangesInput,
  UpdatePromptInput,
  UpdatePromptVersionInput,
} from "./prompts.types";
import { PromptVersionService } from "./promptVersion";
import checkPromptAndAnnotationSchemaAlignment from "./services/checkPromptAndAnnotationSchemaAlignment.server";
import suggestPromptAndAnnotationSchemaChanges from "./services/suggestPromptAndAnnotationSchemaChanges.server";

function getActiveUser(context: ControllerContext) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }
  return { user, activeTeam };
}

async function getActivePrompt(
  promptId: string,
  context: ControllerContext,
  permission: "canView" | "canUpdate" | "canDelete",
) {
  const { user, activeTeam } = getActiveUser(context);
  if (!isValidObjectId(promptId)) {
    throw { statusCode: 404, message: "Prompt not found" };
  }

  const prompt = await PromptService.findOne({
    _id: promptId,
    team: activeTeam,
  });
  if (!prompt) {
    throw { statusCode: 404, message: "Prompt not found" };
  }

  if (!PromptAuthorization[permission](user, prompt)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to access this prompt.",
    };
  }

  return { user, activeTeam, prompt };
}

async function getPromptVersionOrThrow(promptId: string, version: number) {
  const promptVersion = await PromptVersionService.findOne({
    prompt: promptId,
    version,
  });
  if (!promptVersion) {
    throw { statusCode: 404, message: "Prompt version not found" };
  }
  return promptVersion;
}

function requireCanPublish(user: User) {
  if (!PromptLibraryAuthorization.canPublish(user)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to publish prompts.",
    };
  }
}

function withSystemFields(annotationSchema: AnnotationSchemaItem[]) {
  const schema = [...annotationSchema];
  for (const systemField of [...SYSTEM_FIELDS].reverse()) {
    const exists = schema.some(
      (field) =>
        field.isSystem === true && field.fieldKey === systemField.fieldKey,
    );
    if (!exists) {
      schema.unshift(systemField);
    }
  }
  return schema;
}

export async function getPromptsByActiveTeam(
  {
    currentPage = 1,
    searchValue,
    sort = "name",
    annotationType,
  }: GetPromptsByActiveTeamInput,
  context: ControllerContext,
) {
  const { activeTeam } = getActiveUser(context);

  const query = buildQueryFromParams({
    match: { team: activeTeam, deletedAt: { $exists: false } },
    queryParams: {
      currentPage,
      searchValue,
      sort,
      filters: annotationType ? { annotationType } : undefined,
    },
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
    filterableFields: ["annotationType"],
  });

  const { data, count, totalPages } = await PromptService.paginate(query);
  return { data, count, currentPage, totalPages };
}

export async function getSavedPrompts(
  { annotationType }: GetSavedPromptsInput,
  context: ControllerContext,
) {
  const { activeTeam } = getActiveUser(context);

  const data = await PromptService.findWithSavedVersions({
    match: {
      annotationType,
      team: activeTeam,
      deletedAt: { $exists: false },
    },
  });
  return { data };
}

export async function createPrompt(
  { name, annotationType }: CreatePromptInput,
  context: ControllerContext,
) {
  const { user, activeTeam } = getActiveUser(context);
  if (!PromptAuthorization.canCreate(user, activeTeam)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to create a prompt in this team.",
    };
  }

  const prompt = await PromptService.create({
    name,
    annotationType,
    team: activeTeam,
    productionVersion: 1,
    createdBy: user._id,
  });
  await PromptVersionService.create({
    name: "initial",
    prompt: prompt._id,
    version: 1,
    annotationSchema: SYSTEM_FIELDS,
  });

  trackServerEvent({ name: "prompt_created", userId: user._id });
  await createGeneralJob("TRACK_FIRST_PROMPT", { userId: user._id });

  return { data: prompt };
}

export async function getPromptById(
  { promptId }: PromptIdInput,
  context: ControllerContext,
) {
  const { prompt } = await getActivePrompt(promptId, context, "canView");
  return { data: prompt };
}

export async function updatePromptById(
  { promptId, name }: UpdatePromptInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canUpdate");

  const updated = await PromptService.updateById(promptId, { name });
  return { data: updated };
}

export async function deletePromptById(
  { promptId }: PromptIdInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canDelete");

  const runsUsingPromptCount = await RunService.count({
    prompt: promptId,
    isComplete: false,
    isHuman: { $ne: true },
  });
  if (runsUsingPromptCount > 0) {
    throw {
      statusCode: 400,
      message: `Cannot delete prompt: ${runsUsingPromptCount} active run(s) reference it. Wait for runs to complete or create a new prompt for future runs.`,
    };
  }

  try {
    await PromptService.softDelete(promptId);
  } catch (error) {
    if (error instanceof PromptPublishedError) {
      throw { statusCode: 400, message: error.message };
    }
    throw error;
  }
  return { data: { deleted: true } };
}

export async function publishPrompt(
  { promptId, description, authors, paperRefs }: PublishPromptInput,
  context: ControllerContext,
) {
  const { user } = await getActivePrompt(promptId, context, "canUpdate");
  requireCanPublish(user);

  try {
    const published = await PromptService.publish(promptId, {
      description,
      authors: cleanAuthors(authors),
      paperRefs: cleanPaperRefs(paperRefs),
    });
    return { data: published };
  } catch (error) {
    if (error instanceof PublishError) {
      throw { statusCode: 400, message: error.message };
    }
    throw error;
  }
}

export async function unpublishPrompt(
  { promptId }: PromptIdInput,
  context: ControllerContext,
) {
  const { user } = await getActivePrompt(promptId, context, "canUpdate");
  requireCanPublish(user);

  const unpublished = await PromptService.unpublish(promptId);
  return { data: unpublished };
}

export async function getPromptVersions(
  { promptId, hasBeenSaved }: GetPromptVersionsInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canView");

  const data = await PromptVersionService.find({
    match: { prompt: promptId, ...(hasBeenSaved ? { hasBeenSaved } : {}) },
    sort: { version: -1 },
  });
  return { data };
}

export async function createNextPromptVersion(
  { promptId, version }: PromptVersionInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canUpdate");

  const previousVersion = await PromptVersionService.findOne({
    prompt: promptId,
    version,
  });
  if (!previousVersion) {
    throw { statusCode: 400, message: "Previous prompt version not found" };
  }

  const promptVersion = await PromptVersionService.createNextVersion(
    promptId,
    previousVersion,
  );
  return { data: promptVersion };
}

export async function getPromptVersion(
  { promptId, version }: PromptVersionInput,
  context: ControllerContext,
) {
  const { activeTeam, prompt } = await getActivePrompt(
    promptId,
    context,
    "canView",
  );
  const promptVersion = await getPromptVersionOrThrow(promptId, version);

  let linkedCodebook: {
    _id: string;
    name: string;
    version: number;
    teamId: string;
  } | null = null;

  if (promptVersion.codebook) {
    const [codebook, codebookVersion] = await Promise.all([
      CodebookService.findOne({
        _id: promptVersion.codebook,
        team: activeTeam,
      }),
      CodebookVersionService.findOne({
        _id: promptVersion.codebookVersion,
        codebook: promptVersion.codebook,
      }),
    ]);
    if (codebook && codebookVersion) {
      linkedCodebook = {
        _id: codebook._id,
        name: codebook.name,
        version: codebookVersion.version,
        teamId: getReferenceId(codebook.team),
      };
    }
  }

  return {
    data: {
      ...promptVersion,
      linkedCodebook,
      systemPrompt: getSystemPrompt("annotation", prompt.annotationType),
    },
  };
}

export async function updatePromptVersion(
  {
    promptId,
    version,
    name,
    userPrompt,
    annotationSchema,
  }: UpdatePromptVersionInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canUpdate");
  const promptVersion = await getPromptVersionOrThrow(promptId, version);

  const schema = withSystemFields(annotationSchema);
  const updated = await PromptVersionService.updateById(promptVersion._id, {
    name,
    userPrompt,
    annotationSchema: schema,
    hasBeenSaved: true,
    inputTokens: tokenizePromptVersion(userPrompt, schema),
    updatedAt: new Date().toISOString(),
  });
  return { data: updated };
}

export async function makePromptVersionProduction(
  { promptId, version }: PromptVersionInput,
  context: ControllerContext,
) {
  await getActivePrompt(promptId, context, "canUpdate");
  await getPromptVersionOrThrow(promptId, version);

  const updated = await PromptService.updateById(promptId, {
    productionVersion: version,
  });
  return { data: updated };
}

export async function checkPromptAlignment(
  { promptId, userPrompt, annotationSchema }: CheckPromptAlignmentInput,
  context: ControllerContext,
) {
  const { user, activeTeam } = await getActivePrompt(
    promptId,
    context,
    "canUpdate",
  );

  const data = await checkPromptAndAnnotationSchemaAlignment({
    userPrompt,
    annotationSchema,
    team: activeTeam,
    promptId,
    userId: user._id,
  });
  return { data };
}

export async function suggestPromptChanges(
  {
    promptId,
    userPrompt,
    annotationSchema,
    alignmentScore,
    reasoning,
  }: SuggestPromptChangesInput,
  context: ControllerContext,
) {
  const { user, activeTeam } = await getActivePrompt(
    promptId,
    context,
    "canUpdate",
  );

  const data = await suggestPromptAndAnnotationSchemaChanges({
    userPrompt,
    annotationSchema,
    team: activeTeam,
    promptId,
    alignmentScore,
    reasoning,
    userId: user._id,
  });
  return { data };
}
