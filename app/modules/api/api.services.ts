import { encode } from "gpt-tokenizer";
import { isValidObjectId } from "mongoose";
import isValidTranscript from "~/lib/validation/validateTranscript";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import getDateString from "~/modules/app/helpers/getDateString";
import { TeamBillingService } from "~/modules/billing/teamBilling";
import { FileService } from "~/modules/files/file";
import { getDefaultModelCode } from "~/modules/llm/modelRegistry";
import { ProjectService } from "~/modules/projects/project";
import { PromptService } from "~/modules/prompts/prompt";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import createGeneralJob from "~/modules/queues/helpers/createGeneralJob";
import type { RunAnnotationType } from "~/modules/runs/runs.types";
import { RunSetService } from "~/modules/runSets/runSet";
import type { RunDefinition } from "~/modules/runSets/runSets.types";
import getConversationFromJSON from "~/modules/sessions/helpers/getConversationFromJSON";
import { SessionService } from "~/modules/sessions/session";
import type { SessionFile } from "~/modules/sessions/sessions.types";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import { getProjectFileStoragePath } from "~/modules/uploads/helpers/projectFileStorage";
import { getProjectSessionStoragePath } from "~/modules/uploads/helpers/projectSessionStorage";
import type {
  ControllerContext,
  CreateProjectSessionInput,
  CreateRunSetInput,
} from "./api.types";

export async function createRunSet(
  {
    projectId,
    promptId,
    models,
    shouldRunVerification,
    latestSessionLimit,
  }: CreateRunSetInput,
  context: ControllerContext,
) {
  if (!context.user) {
    throw { statusCode: 401, message: "Authentication required" };
  }

  if (!isValidObjectId(projectId) || !context.activeTeam) {
    throw { statusCode: 404, message: "Project not found" };
  }

  const project = await ProjectService.findOne({
    _id: projectId,
    team: context.activeTeam,
  });
  if (!project) {
    throw { statusCode: 404, message: "Project not found" };
  }

  if (!isValidObjectId(promptId)) {
    throw { statusCode: 404, message: "Prompt not found" };
  }

  const prompt = await PromptService.findOne({
    _id: promptId,
    team: context.activeTeam,
    deletedAt: { $exists: false },
  });
  if (!prompt) {
    throw { statusCode: 404, message: "Prompt not found" };
  }

  const promptVersion = await PromptVersionService.findOne({
    prompt: prompt._id,
    version: prompt.productionVersion,
  });
  if (!promptVersion) {
    throw { statusCode: 404, message: "Prompt version not found" };
  }

  const sessions = await SessionService.find({
    match: { project: project._id, hasConverted: true, hasErrored: false },
    select: "_id",
    sort: { createdAt: -1 },
    ...(latestSessionLimit && {
      pagination: { skip: 0, limit: latestSessionLimit },
    }),
  });
  if (sessions.length === 0) {
    throw { statusCode: 400, message: "Project has no converted sessions" };
  }
  const sessionIds = sessions.map((session) => session._id);

  const modelCodes = models?.length ? models : [getDefaultModelCode()];
  const definitions: RunDefinition[] = modelCodes.map((modelCode) => ({
    key: `${prompt._id}:${promptVersion.version}:${modelCode}`,
    prompt: {
      promptId: prompt._id,
      promptName: prompt.name,
      version: promptVersion.version,
    },
    modelCode,
  }));

  const [balance, estimate] = await Promise.all([
    TeamBillingService.getBalance(context.activeTeam),
    TeamBillingService.estimateCost({
      teamId: context.activeTeam,
      projectId: project._id,
      sessionIds,
      definitions,
      shouldRunVerification: !!shouldRunVerification,
    }),
  ]);
  if (estimate.estimatedCost > balance) {
    throw { statusCode: 402, message: "Insufficient credits to start runs" };
  }

  const result = await RunSetService.createWithRuns({
    project: project._id,
    name: `${prompt.name} - ${getDateString(new Date())}`,
    sessions: sessionIds,
    definitions,
    annotationType: prompt.annotationType as RunAnnotationType,
    shouldRunVerification: !!shouldRunVerification,
    userId: context.user._id,
  });

  trackServerEvent({ name: "run_set_created", userId: context.user._id });
  trackServerEvent({ name: "run_created", userId: context.user._id });
  await createGeneralJob("TRACK_FIRST_RUN", { userId: context.user._id });

  return {
    data: {
      runSetId: result.runSet._id,
      projectId: project._id,
      errors: result.errors,
    },
  };
}

export async function createProjectSession(
  { projectId, session }: CreateProjectSessionInput,
  context: ControllerContext,
) {
  if (!isValidObjectId(projectId) || !context.activeTeam) {
    throw { statusCode: 404, message: "Project not found" };
  }

  // Scoped to the active team so other teams' projects read as not found.
  const project = await ProjectService.findOne({
    _id: projectId,
    team: context.activeTeam,
  });
  if (!project) {
    throw { statusCode: 404, message: "Project not found" };
  }

  if (!Array.isArray(session.transcript) || session.transcript.length === 0) {
    throw {
      statusCode: 400,
      message: "session.transcript must be a non-empty array",
    };
  }

  const sessionId =
    typeof session.session_id === "string" ? session.session_id : undefined;

  const sessionFile = {
    session_id: sessionId,
    transcript: session.transcript.map(
      (utterance: Record<string, unknown>, index: number) => ({
        _id: `${index}`,
        role: utterance.role,
        content: utterance.content,
        start_time: utterance.start_time ?? "",
        end_time: utterance.end_time ?? "",
        timestamp: utterance.timestamp ?? "",
        session_id: utterance.session_id ?? sessionId,
        sequence_id: utterance.sequence_id ?? index,
        annotations: [],
      }),
    ),
    leadRole: "Tutor",
    annotations: [],
  };

  const validation = isValidTranscript(sessionFile);
  if (!validation.valid) {
    const messages = (validation.errors ?? [])
      .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
      .join("; ");
    throw { statusCode: 400, message: `Invalid session: ${messages}` };
  }

  const name = sessionId
    ? `${sessionId}.json`
    : `api-session-${Date.now()}.json`;
  const buffer = Buffer.from(JSON.stringify(sessionFile));
  const inputTokens = encode(
    getConversationFromJSON(sessionFile as unknown as SessionFile),
  ).length;

  const file = await FileService.create({
    name,
    project: projectId,
    fileType: "application/json",
    hasUploaded: true,
  });

  const createdSession = await SessionService.create({
    name,
    project: projectId,
    file: file._id,
    fileType: "application/json",
    hasConverted: true,
    inputTokens,
    createdBy: context.user?._id,
  });

  const storage = getStorageAdapter();
  const upload = (uploadPath: string) =>
    storage.upload({
      file: { buffer, size: buffer.length, type: "application/json" },
      uploadPath,
    });
  await Promise.all([
    upload(getProjectFileStoragePath(projectId, file._id, name)),
    upload(getProjectSessionStoragePath(projectId, createdSession._id, name)),
  ]);

  if (!project.hasSetupProject) {
    await ProjectService.updateById(projectId, { hasSetupProject: true });
  }

  return { data: { session: createdSession } };
}
