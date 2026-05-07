import { ProjectService } from "~/modules/projects/project";
import { PromptVersionService } from "~/modules/prompts/promptVersion";
import type { AnnotationSchemaItem } from "~/modules/prompts/prompts.types";
import TaskSequencer from "~/modules/queues/helpers/taskSequencer";
import { getRunModelCode } from "~/modules/runs/helpers/runModel";
import type { Run } from "~/modules/runs/runs.types";
import { SessionService } from "~/modules/sessions/session";

export default async function createRunAnnotations(
  run: Run,
  evaluationId: string | undefined,
  userId: string,
) {
  const project = await ProjectService.findById(run.project as string);
  if (!project) throw new Error(`Project not found: ${run.project}`);

  if (run.isRunning) {
    return;
  }

  const inputFolder = `storage/${run.project}/preAnalysis`;

  const outputFolder = `storage/${run.project}/runs/${run._id}`;

  const promptVersion = await PromptVersionService.findOne({
    prompt: run.prompt,
    version: Number(run.promptVersion),
  });
  if (!promptVersion) throw new Error("Prompt version not found");
  const userPrompt = promptVersion.userPrompt;

  const annotationFields: Record<string, unknown> = {};

  for (const annotationSchemaItem of promptVersion.annotationSchema as AnnotationSchemaItem[]) {
    annotationFields[annotationSchemaItem.fieldKey] =
      annotationSchemaItem.value;
  }
  const annotationSchema = { annotations: [annotationFields] };

  let currentSessionIndex = 0;

  const annotationType =
    run.annotationType === "PER_UTTERANCE"
      ? "ANNOTATE_PER_UTTERANCE"
      : "ANNOTATE_PER_SESSION";

  const taskSequencer = new TaskSequencer("ANNOTATE_RUN");

  taskSequencer.addTask("START", {
    projectId: run.project,
    runId: run._id,
    userId,
  });

  for (const session of run.sessions) {
    currentSessionIndex++;
    if (session.status === "DONE") {
      continue;
    }
    const sessionModel = await SessionService.findById(session.sessionId);
    if (!sessionModel) {
      throw new Error(`Session not found: ${session.sessionId}`);
    }

    taskSequencer.addTask(
      "PROCESS",
      {
        annotationType,
        projectId: run.project,
        runId: run._id,
        sessionId: session.sessionId,
        inputFile: `${inputFolder}/${sessionModel._id}/${sessionModel.name}`,
        outputFolder: `${outputFolder}/${sessionModel._id}`,
        prompt: {
          prompt: userPrompt,
          annotationSchema,
          schemaItems: promptVersion.annotationSchema,
        },
        model: getRunModelCode(run),
        team: project.team,
        userId,
        currentSessionIndex,
        shouldRunVerification: !!run.shouldRunVerification,
        isAdjudication: !!run.isAdjudication,
        sourceRunIds: run.adjudication?.sourceRuns || [],
      },
      { group: { id: String(run.project) } },
    );
  }

  taskSequencer.addTask("FINISH", {
    projectId: run.project,
    runId: run._id,
    evaluationId,
    userId,
  });

  taskSequencer.run();
}
