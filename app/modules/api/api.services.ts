import { encode } from "gpt-tokenizer";
import { isValidObjectId } from "mongoose";
import isValidTranscript from "~/lib/validation/validateTranscript";
import { FileService } from "~/modules/files/file";
import { ProjectService } from "~/modules/projects/project";
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
  { projectId, sessions }: CreateRunSetInput,
  context: ControllerContext,
) {
  const runSet = {
    projectId,
    sessions,
    activeTeam: context.activeTeam,
    createdBy: context.user?._id,
  };
  console.log("createRunSet", runSet);
  return { data: runSet };
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
