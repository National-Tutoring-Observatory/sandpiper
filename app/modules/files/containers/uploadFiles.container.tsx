import filter from "lodash/filter";
import includes from "lodash/includes";
import xor from "lodash/xor";
import { useState } from "react";
import type { FetcherWithComponents } from "react-router";
import { useFetcher } from "react-router";
import type { Tag } from "~/modules/tags/tags.types";
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const tagsFetcher = useFetcher({ key: "tagsSelector" });

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

    selectedTags.forEach((tagId) => {
      formData.append("tags", tagId);
    });

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

  const onSelectedTagsToggled = (tagId: string) => {
    setSelectedTags(xor(selectedTags, [tagId]));
  };

  const selectedTagsData: Tag[] = filter(
    tagsFetcher.data?.tags?.data,
    (tag: Tag) => includes(selectedTags, tag._id),
  );

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
      selectedTags={selectedTagsData}
      onSelectedTagsToggled={onSelectedTagsToggled}
    />
  );
}
