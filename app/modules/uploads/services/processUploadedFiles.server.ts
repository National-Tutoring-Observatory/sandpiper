import { ProjectService } from "~/modules/projects/project";
import getAttributeMappingFromFile from "~/modules/sessions/helpers/getAttributeMappingFromFile";
import createSessionsFromFiles from "~/modules/sessions/services/createSessionsFromFiles.server";
import splitMultipleSessionsIntoFiles from "./splitMultipleSessionsIntoFiles";
import uploadFiles from "./uploadFiles";

export default async function processUploadedFiles({
  projectId,
  files,
  team,
  userId,
  tags,
}: {
  projectId: string;
  files: File[];
  team: string;
  userId: string;
  tags: string[];
}) {
  const splitFiles = await splitMultipleSessionsIntoFiles({ files });

  if (splitFiles.length === 0) {
    throw new Error("No valid sessions found in uploaded files.");
  }

  const attributesMapping = await getAttributeMappingFromFile({
    file: splitFiles[0],
    team,
    projectId,
    userId,
  });

  uploadFiles({ files: splitFiles, entityId: projectId })
    .then((fileIds) =>
      createSessionsFromFiles({
        projectId,
        shouldCreateSessionModels: true,
        attributesMapping,
        tags,
        fileIds,
      }),
    )
    .catch(async (error) => {
      console.error("File upload/conversion failed:", error);
      await ProjectService.updateById(projectId, {
        isUploadingFiles: false,
        isConvertingFiles: false,
      });
    });

  await ProjectService.updateById(projectId, { isUploadingFiles: true });
}
