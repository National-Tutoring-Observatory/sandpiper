import { Label } from "@/components/ui/label";
import clsx from "clsx";
import { FileUp } from "lucide-react";
import type { useDropzone } from "react-dropzone";

const SelectCsvStep = ({
  getRootProps,
  getInputProps,
  isDragActive,
}: {
  getRootProps: ReturnType<typeof useDropzone>["getRootProps"];
  getInputProps: ReturnType<typeof useDropzone>["getInputProps"];
  isDragActive: boolean;
}) => {
  const dropzoneClassName = clsx(
    "border border-dashed border-border p-12 rounded-md hover:bg-muted dark:hover:bg-gray-900 text-center cursor-pointer",
  );

  return (
    <div className="grid gap-3">
      <Label>Select CSV file</Label>
      <div className={dropzoneClassName} {...getRootProps()}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <FileUp className="text-muted-foreground h-8 w-8" />
          {isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <p className="text-muted-foreground text-body">
              Drag and drop a CSV file here, or click to select
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelectCsvStep;
