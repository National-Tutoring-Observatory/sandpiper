import { useState } from "react";
import type { FetcherWithComponents } from "react-router";
import UploadFiles from "../components/uploadFiles";
import { SUPPORTED_FILE_TYPES } from "../constants";
import type { FileType, UploadFilesData } from "../files.types";
import getInstructionsByFileType from "../helpers/getInstructionsByFileType";
import useFileAccumulator from "../hooks/useFileAccumulator";

interface UploadFilesContainerProps {
  projectId: string;
  uploadFetcher: FetcherWithComponents<UploadFilesData>;
}

export default function UploadFilesContainer({
  projectId,
  uploadFetcher,
}: UploadFilesContainerProps) {
  const { acceptedFiles, addFiles, removeFile } = useFileAccumulator();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const handleTagChanged = (tagId: string) => {
    setSelectedTagIds((current) => {
      const nextSelectedTagIds = current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId];
      console.log("Selected tags:", nextSelectedTagIds);
      return nextSelectedTagIds;
    });
  };

  const instructionsByType = SUPPORTED_FILE_TYPES.reduce(
    (acc, fileType) => {
      acc[fileType] = getInstructionsByFileType({ fileType });
      return acc;
    },
    {} as Record<FileType, { overview: string; link: string }>,
  );

  const handleUpload = () => {
    const formData = new FormData();
    formData.append(
      "body",
      JSON.stringify({
        intent: "UPLOAD_PROJECT_FILES",
        entityId: projectId,
      }),
    );

    acceptedFiles.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("tagIds", JSON.stringify(selectedTagIds));

    uploadFetcher.submit(formData, {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const handleUseMtmDataset = () => {
    uploadFetcher.submit(JSON.stringify({ intent: "INSERT_MTM_DATASET" }), {
      method: "POST",
      encType: "application/json",
    });
  };

  return (
    <UploadFiles
      acceptedFiles={acceptedFiles}
      instructionsByType={instructionsByType}
      isUploading={uploadFetcher.state === "submitting"}
      onDrop={addFiles}
      onDeleteAcceptedFileClicked={removeFile}
      fetcher={uploadFetcher}
      onUploadClick={handleUpload}
      onUseMtmDatasetClicked={handleUseMtmDataset}
      selectedTagIds={selectedTagIds}
      onTagsChanged={handleTagChanged}
    />
  );
}
