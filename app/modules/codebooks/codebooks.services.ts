import { isValidObjectId } from "mongoose";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import buildQueryFromParams from "~/modules/app/helpers/buildQueryFromParams";
import PromptAuthorization from "~/modules/prompts/authorization";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import type { ControllerContext } from "../api/api.types";
import CodebookAuthorization from "./authorization";
import { CodebookService } from "./codebook";
import type {
  CodebookIdInput,
  CodebookVersionInput,
  CreateCodebookInput,
  CreateCodebookVersionInput,
  CreatePromptFromCodebookInput,
  GetCodebooksByActiveTeamInput,
  UpdateCodebookInput,
  UpdateCodebookVersionInput,
} from "./codebooks.types";
import { CodebookVersionService } from "./codebookVersion";

function getActiveUser(context: ControllerContext) {
  const { activeTeam, user } = context;
  if (!user || !activeTeam) {
    throw { statusCode: 400, message: "No active team" };
  }
  return { user, activeTeam };
}

async function getActiveCodebook(
  codebookId: string,
  context: ControllerContext,
  permission: "canView" | "canUpdate" | "canDelete",
) {
  const { user, activeTeam } = getActiveUser(context);
  if (!isValidObjectId(codebookId)) {
    throw { statusCode: 404, message: "Codebook not found" };
  }

  const codebook = await CodebookService.findOne({
    _id: codebookId,
    team: activeTeam,
  });
  if (!codebook) {
    throw { statusCode: 404, message: "Codebook not found" };
  }

  if (!CodebookAuthorization[permission](user, codebook)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to access this codebook.",
    };
  }

  return { user, activeTeam, codebook };
}

async function getCodebookVersionOrThrow(codebookId: string, version: number) {
  const codebookVersion = await CodebookVersionService.findOne({
    codebook: codebookId,
    version,
  });
  if (!codebookVersion) {
    throw { statusCode: 404, message: "Codebook version not found" };
  }
  return codebookVersion;
}

export async function getCodebooksByActiveTeam(
  {
    currentPage = 1,
    searchValue,
    sort = "name",
  }: GetCodebooksByActiveTeamInput,
  context: ControllerContext,
) {
  const { activeTeam } = getActiveUser(context);

  const query = buildQueryFromParams({
    match: { team: activeTeam, deletedAt: { $exists: false } },
    queryParams: { currentPage, searchValue, sort },
    searchableFields: ["name"],
    sortableFields: ["name", "createdAt"],
  });

  const { data, count, totalPages } = await CodebookService.paginate(query);
  return { data, count, currentPage, totalPages };
}

export async function createCodebook(
  { name, description }: CreateCodebookInput,
  context: ControllerContext,
) {
  const { user, activeTeam } = getActiveUser(context);
  if (!CodebookAuthorization.canCreate(user, activeTeam)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to create codebooks in this team.",
    };
  }

  const codebook = await CodebookService.create({
    name,
    description: description || "",
    team: activeTeam,
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

  return { data: codebook };
}

export async function getCodebookById(
  { codebookId }: CodebookIdInput,
  context: ControllerContext,
) {
  const { codebook } = await getActiveCodebook(codebookId, context, "canView");
  return { data: codebook };
}

export async function updateCodebookById(
  { codebookId, name, description }: UpdateCodebookInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canUpdate");

  const updated = await CodebookService.updateById(codebookId, {
    name,
    description: description || "",
  });
  return { data: updated };
}

export async function deleteCodebookById(
  { codebookId }: CodebookIdInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canDelete");

  await CodebookService.updateById(codebookId, { deletedAt: new Date() });
  return { data: { deleted: true } };
}

export async function getCodebookVersions(
  { codebookId }: CodebookIdInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canView");

  const data = await CodebookVersionService.find({
    match: { codebook: codebookId },
    sort: { version: -1 },
  });
  return { data };
}

export async function createNextCodebookVersion(
  { codebookId, version }: CreateCodebookVersionInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canUpdate");

  const previousVersion = await CodebookVersionService.findOne({
    codebook: codebookId,
    version,
  });
  if (!previousVersion) {
    throw { statusCode: 400, message: "Previous codebook version not found" };
  }

  const codebookVersion = await CodebookVersionService.createNextVersion(
    codebookId,
    previousVersion,
  );
  return { data: codebookVersion };
}

export async function getCodebookVersion(
  { codebookId, version }: CodebookVersionInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canView");

  const codebookVersion = await getCodebookVersionOrThrow(codebookId, version);
  return { data: codebookVersion };
}

export async function updateCodebookVersion(
  { codebookId, version, name, categories }: UpdateCodebookVersionInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canUpdate");

  const codebookVersion = await getCodebookVersionOrThrow(codebookId, version);
  const updated = await CodebookVersionService.updateById(codebookVersion._id, {
    name,
    categories,
    hasBeenSaved: true,
    updatedAt: new Date().toISOString(),
  });
  return { data: updated };
}

export async function makeCodebookVersionProduction(
  { codebookId, version }: CodebookVersionInput,
  context: ControllerContext,
) {
  await getActiveCodebook(codebookId, context, "canUpdate");
  await getCodebookVersionOrThrow(codebookId, version);

  const updated = await CodebookService.updateById(codebookId, {
    productionVersion: version,
  });
  return { data: updated };
}

export async function createPromptFromCodebook(
  {
    codebookId,
    codebookVersionId,
    annotationType,
    categoryIds,
    hasFlattenedCategories,
    flattenedAnnotationField,
  }: CreatePromptFromCodebookInput,
  context: ControllerContext,
) {
  const { user, activeTeam } = await getActiveCodebook(
    codebookId,
    context,
    "canUpdate",
  );

  if (!PromptAuthorization.canCreate(user, activeTeam)) {
    throw {
      statusCode: 403,
      message: "You do not have permission to create prompts in this team.",
    };
  }

  const prompt = await CodebookService.createPromptFromCodebook({
    codebookId,
    codebookVersionId,
    annotationType,
    categoryIds,
    hasFlattenedCategories,
    flattenedAnnotationField,
    userId: user._id,
    teamId: activeTeam,
  });

  trackServerEvent({ name: "prompt_created", userId: user._id });
  await createGeneralJob("TRACK_FIRST_PROMPT", { userId: user._id });

  return { data: prompt };
}
