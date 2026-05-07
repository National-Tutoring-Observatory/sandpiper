import { emitter } from "~/modules/events/emitter";
import { ProjectService } from "~/modules/projects/project";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import { getRunModelCode } from "~/modules/runs/helpers/runModel";
import { RunService } from "~/modules/runs/run";
import { SessionService } from "~/modules/sessions/session";
import { handler as annotatePerSession } from "./annotatePerSession/app";
import { handler as annotatePerUtterance } from "./annotatePerUtterance/app";

export default async function annotateRunSessions({
  runId,
}: {
  runId: string;
}) {
  const run = await RunService.findById(runId);
  if (!run) throw new Error(`Run not found: ${runId}`);
  if (!run.createdBy) throw new Error(`Run ${runId} has no createdBy`);
  const project = await ProjectService.findById(run.project as string);
  if (!project) throw new Error(`Project not found: ${run.project}`);

  if (run.isRunning) {
    return {};
  }

  const inputDirectory = `storage/${run.project}/preAnalysis`;

  const outputDirectory = `storage/${run.project}/runs/${run._id}`;

  await RunService.updateById(runId, {
    isRunning: true,
    startedAt: new Date(),
  });

  const promptVersion = await PromptVersionService.findOne({
    prompt: run.prompt,
    version: Number(run.promptVersion),
  });
  if (!promptVersion)
    throw new Error(
      `Prompt version not found: ${run.prompt} v${run.promptVersion}`,
    );

  emitter.emit("ANNOTATE_RUN_SESSION", {
    runId: runId,
    projectId: project._id,
    progress: 0,
    status: "STARTED",
    step: `0/${run.sessions.length}`,
  });

  const annotationFields: Record<string, unknown> = {};

  for (const annotationSchemaItem of promptVersion.annotationSchema as AnnotationSchemaItem[]) {
    annotationFields[annotationSchemaItem.fieldKey] =
      annotationSchemaItem.value;
  }
  const annotationSchema = { annotations: [annotationFields] };

  let completedSessions = 0;

  let hasErrored = false;

  for (const session of run.sessions) {
    if (session.status === "DONE") {
      completedSessions++;
      emitter.emit("ANNOTATE_RUN_SESSION", {
        runId: runId,
        projectId: project._id,
        progress: Math.round((100 / run.sessions.length) * completedSessions),
        status: "RUNNING",
      });
      continue;
    }
    const sessionModel = await SessionService.findById(session.sessionId);
    if (!sessionModel)
      throw new Error(`Session not found: ${session.sessionId}`);

    session.status = "RUNNING";
    session.startedAt = new Date();

    await RunService.updateById(runId, {
      sessions: run.sessions,
    });

    emitter.emit("ANNOTATE_RUN_SESSION", {
      runId: runId,
      projectId: project._id,
      progress: Math.round((100 / run.sessions.length) * completedSessions),
      status: "RUNNING",
      step: `${completedSessions + 1}/${run.sessions.length}`,
    });

    let status: "DONE" | "ERRORED" | "RUNNING";

    try {
      if (run.annotationType === "PER_UTTERANCE") {
        await annotatePerUtterance({
          body: {
            inputFile: `${inputDirectory}/${sessionModel._id}/${sessionModel.name}`,
            outputFolder: `${outputDirectory}/${sessionModel._id}`,
            prompt: { prompt: promptVersion.userPrompt, annotationSchema },
            model: getRunModelCode(run) ?? "",
            team: String(project.team),
            userId: run.createdBy,
            sessionId: session.sessionId,
            billingEventId: `annotate-run:${runId}:${session.sessionId}:per-utterance`,
          },
        });
      } else {
        await annotatePerSession({
          body: {
            inputFile: `${inputDirectory}/${sessionModel._id}/${sessionModel.name}`,
            outputFolder: `${outputDirectory}/${sessionModel._id}`,
            prompt: { prompt: promptVersion.userPrompt, annotationSchema },
            model: getRunModelCode(run) ?? "",
            team: String(project.team),
            userId: run.createdBy,
            sessionId: session.sessionId,
            billingEventId: `annotate-run:${runId}:${session.sessionId}:per-session`,
          },
        });
      }
      status = "DONE";
    } catch (error) {
      console.warn(error);
      status = "ERRORED";
      hasErrored = true;
    }

    session.status = status;
    session.finishedAt = new Date();
    await RunService.updateById(runId, {
      sessions: run.sessions,
    });
    completedSessions++;
    emitter.emit("ANNOTATE_RUN_SESSION", {
      runId: runId,
      projectId: project._id,
      progress: Math.round((100 / run.sessions.length) * completedSessions),
      status: "RUNNING",
    });
  }

  await RunService.updateById(runId, {
    isRunning: false,
    isComplete: true,
    hasErrored,
    finishedAt: new Date(),
  });

  emitter.emit("ANNOTATE_RUN_SESSION", {
    runId: runId,
    projectId: project._id,
    progress: 100,
    status: "DONE",
  });
}
