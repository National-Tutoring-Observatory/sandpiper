import TaskSequencer from "~/modules/queues/helpers/taskSequencer";
import { SessionService } from "~/modules/sessions/session";

interface MatchedSession {
  sessionId: string;
  name: string;
  _id: string;
}

interface UploadHumanAnnotationsProps {
  runIds: string[];
  annotators: string[];
  headers: string[];
  fieldTypes: Record<string, string>;
  csvPath: string;
  projectId: string;
  matchedSessions: MatchedSession[];
}

export default async function uploadHumanAnnotations({
  runIds,
  annotators,
  headers,
  fieldTypes,
  csvPath,
  projectId,
  matchedSessions,
}: UploadHumanAnnotationsProps) {
  for (let i = 0; i < annotators.length; i++) {
    const runId = runIds[i];
    const annotator = annotators[i];

    const taskSequencer = new TaskSequencer("UPLOAD_HUMAN_ANNOTATIONS");

    taskSequencer.addTask("START", {
      projectId,
      runId,
    });

    for (const matched of matchedSessions) {
      const session = await SessionService.findById(matched._id);
      if (!session) continue;

      taskSequencer.addTask("PROCESS", {
        projectId,
        runId,
        sessionId: matched._id,
        sessionName: session.name,
        annotator,
        headers,
        fieldTypes,
        csvPath,
        inputFile: `storage/${projectId}/preAnalysis/${session._id}/${session.name}`,
        outputFolder: `storage/${projectId}/runs/${runId}/${session._id}`,
      });
    }

    taskSequencer.addTask("FINISH", {
      projectId,
      runId,
    });

    await taskSequencer.run();
  }
}
