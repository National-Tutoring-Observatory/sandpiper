import { FileService } from "~/modules/files/file";
import { ProjectService } from "~/modules/projects/project";
import TaskSequencer from "~/modules/queues/helpers/taskSequencer";
import { SessionService } from "~/modules/sessions/session";
import { getProjectFileStoragePath } from "~/modules/uploads/helpers/projectFileStorage";
import { getProjectSessionStorageDir } from "~/modules/uploads/helpers/projectSessionStorage";

export default async function createSessionsFromFiles({
  projectId,
  shouldCreateSessionModels = true,
  attributesMapping,
  tagIds = [],
}: {
  projectId: string;
  shouldCreateSessionModels: boolean;
  attributesMapping?: Record<string, unknown>;
  tagIds?: string[];
}) {
  const projectFiles = await FileService.findByProject(projectId);

  const project = await ProjectService.findById(projectId);
  if (!project) throw new Error("Project not found");

  if (shouldCreateSessionModels) {
    const existingSessions = await SessionService.find({
      match: { project: projectId },
    });
    const filesWithSessions = new Set(
      existingSessions.map((s) => String(s.file)),
    );

    for (const projectFile of projectFiles) {
      if (filesWithSessions.has(String(projectFile._id))) continue;
      await SessionService.create({
        project: projectFile.project,
        file: projectFile._id,
        fileType: "application/json",
        name: `${projectFile.name.replace(/\.[^.]+$/, "")}.json`,
        hasConverted: false,
        tags: tagIds,
      });
    }
  }

  const projectSessions = await SessionService.find({
    match: { project: projectId },
  });

  const taskSequencer = new TaskSequencer("CONVERT_FILES_TO_SESSIONS");

  taskSequencer.addTask("START", {
    projectId,
  });

  for (const projectSession of projectSessions) {
    if (projectSession.hasConverted) {
      continue;
    }
    const file = await FileService.findById(projectSession.file as string);
    if (!file) throw new Error("File not found");
    taskSequencer.addTask(
      "PROCESS",
      {
        projectId,
        sessionId: projectSession._id,
        inputFile: getProjectFileStoragePath(
          projectId,
          String(projectSession.file),
          file.name,
        ),
        outputFolder: getProjectSessionStorageDir(
          projectId,
          projectSession._id,
        ),
        team: project.team,
        attributesMapping,
      },
      { group: { id: projectId } },
    );
  }

  taskSequencer.addTask("FINISH", {
    projectId,
  });

  await taskSequencer.run();
}
