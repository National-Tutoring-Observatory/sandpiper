import type { Job } from "bullmq";
import fse from "fs-extra";
import filter from "lodash/filter";
import map from "lodash/map.js";
import getPromptText from "workers/helpers/getPromptText";
import buildAnnotationSchema from "../../app/modules/llm/helpers/buildAnnotationSchema";
import handleLLMError from "../../app/modules/llm/helpers/handleLLMError";
import LLM from "../../app/modules/llm/llm";
import { RunService } from "../../app/modules/runs/run";
import getConversationFromJSON from "../../app/modules/sessions/helpers/getConversationFromJSON";
import getStorageAdapter from "../../app/modules/storage/helpers/getStorageAdapter";
import buildAdjudicationPrompt from "../helpers/buildAdjudicationPrompt";
import emitFromJob from "../helpers/emitFromJob";
import updateRunSession from "../helpers/updateRunSession";

const adjudicatePerSessionPrompt = getPromptText("adjudicatePerSession");

export default async function adjudicatePerSession(job: Job) {
  const {
    runId,
    sessionId,
    inputFile,
    outputFolder,
    prompt,
    model,
    team,
    userId,
  } = job.data;

  const currentRun = await RunService.findById(runId);
  const resolvedUserId = userId || currentRun?.createdBy;

  try {
    await updateRunSession({
      runId,
      sessionId,
      update: {
        status: "RUNNING",
        startedAt: new Date(),
      },
    });

    await emitFromJob(job, { runId, sessionId }, "STARTED");

    const storage = getStorageAdapter();

    const downloadedPath = await storage.download({ sourcePath: inputFile });
    const data = await fse.readFile(downloadedPath);

    const inputFileSplit = inputFile.split("/");
    const outputFileName = inputFileSplit[inputFileSplit.length - 1].replace(
      ".json",
      "",
    );

    const originalJSON = JSON.parse(data.toString());
    const conversation = getConversationFromJSON(originalJSON);

    console.log("[adjudicatePerSession] Session:", sessionId);

    const {
      hasDisagreements,
      adjudicationContext,
      firstSourceRunSessionFile,
      agreedAnnotations,
    } = await buildAdjudicationPrompt({
      sessionId,
      sourceRunIds: currentRun!.adjudication!.sourceRuns,
      projectId: job.data.projectId,
      annotationType: "PER_SESSION",
      originalJSON,
    });

    if (!hasDisagreements) {
      console.log(
        "[adjudicatePerSession] No disagreements — copying from first source run",
      );

      const srcAnnotations = firstSourceRunSessionFile?.annotations || [];
      originalJSON.annotations = map(srcAnnotations, (annotation, index) => ({
        ...annotation,
        _id: `${index}`,
      }));
    } else {
      console.log("[adjudicatePerSession] Calling LLM for adjudication");

      const responseSchema = buildAnnotationSchema(
        prompt.annotationSchema,
        prompt.schemaItems,
      );

      const llm = new LLM({
        model,
        team,
        userId: resolvedUserId,
        schema: responseSchema,
        source: "adjudication:per-session",
        sourceId: sessionId,
        billingEventId: `${job.id}:adjudication`,
        timeout: 600_000,
      });

      llm.addSystemMessage(adjudicatePerSessionPrompt, {
        annotationSchema: JSON.stringify(prompt.annotationSchema),
        leadRole: originalJSON.leadRole || "TEACHER",
      });

      llm.addUserMessage(
        `${prompt.prompt}\n\n{{adjudicationContext}}\n\nConversation: {{conversation}}`,
        { adjudicationContext, conversation },
      );

      const response = await llm.createChat();
      const adjudicatedAnnotations = response.annotations || [];

      console.log(
        "[adjudicatePerSession] LLM returned",
        adjudicatedAnnotations.length,
        "adjudicated annotations",
      );

      // Merge agreed annotations with adjudicated ones
      const allAnnotations = [
        ...Array.from(agreedAnnotations.values()),
        ...adjudicatedAnnotations,
      ];

      originalJSON.annotations = map(allAnnotations, (annotation, index) => ({
        ...annotation,
        _id: `${index}`,
      }));
    }

    // Write output
    await fse.outputJSON(
      `tmp/${outputFolder}/${outputFileName}.json`,
      originalJSON,
    );

    const buffer = await fse.readFile(
      `tmp/${outputFolder}/${outputFileName}.json`,
    );

    await storage.upload({
      file: { buffer, size: buffer.length, type: "application/json" },
      uploadPath: `${outputFolder}/${outputFileName}.json`,
    });

    await fse.remove(`tmp/${outputFolder}/${outputFileName}.json`);

    await updateRunSession({
      runId,
      sessionId,
      update: {
        status: "DONE",
        finishedAt: new Date(),
      },
    });

    const run = await RunService.findById(runId);

    if (!run) {
      throw new Error(`Run not found: ${runId}`);
    }

    const sessionsCount = run.sessions.length;
    const completedSessionsCount = filter(run.sessions, {
      status: "DONE",
    }).length;

    await emitFromJob(
      job,
      {
        runId,
        sessionId,
        progress: Math.round((100 / sessionsCount) * completedSessionsCount),
        step: `${completedSessionsCount}/${sessionsCount}`,
      },
      "FINISHED",
    );

    return { status: "SUCCESS" };
  } catch (error: unknown) {
    const errorMessage = handleLLMError(error);

    await updateRunSession({
      runId,
      sessionId,
      update: {
        error: errorMessage,
        status: "ERRORED",
        finishedAt: new Date(),
      },
    });

    await emitFromJob(job, { runId, sessionId }, "ERRORED");

    return { status: "ERRORED", error: errorMessage };
  }
}
