import path from "path";
import { FileService } from "~/modules/files/file";
import { ProjectService } from "~/modules/projects/project";
import { emitter } from "../../events/emitter";
import { getProjectFileStoragePath } from "../helpers/projectFileStorage";
import uploadFile from "./uploadFile";

export default async function uploadFiles({
  files,
  entityId,
}: {
  files: File[];
  entityId: string;
}) {
  let completedFiles = 0;
  const fileIds: string[] = [];

  for (const file of files) {
    if (file instanceof File) {
      const name = path.basename(file.name);
      const newFile = await FileService.create({
        project: entityId,
        fileType: file.type,
        name,
      });
      fileIds.push(newFile._id);

      const uploadPath = getProjectFileStoragePath(
        entityId,
        newFile._id,
        file.name,
      );
      await uploadFile({ file, uploadPath }).then(async () => {
        await FileService.updateById(newFile._id, {
          hasUploaded: true,
        });
        completedFiles++;
        emitter.emit("UPLOAD_FILES", {
          projectId: entityId,
          progress: Math.round((100 / files.length) * completedFiles),
          status: "RUNNING",
        });
      });
    } else {
      console.warn("Expected a File, but got:", file);
    }
  }
  await ProjectService.updateById(entityId, { isUploadingFiles: false });
  emitter.emit("UPLOAD_FILES", {
    projectId: entityId,
    progress: 100,
    status: "DONE",
  });

  return fileIds;
}
