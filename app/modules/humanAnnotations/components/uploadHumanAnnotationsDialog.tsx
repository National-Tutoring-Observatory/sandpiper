import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useFetcher } from "react-router";
import extractAnnotationCsvMeta, {
  type AnnotationCsvMeta,
} from "../helpers/extractAnnotationCsvMeta";
import type { AnalysisResult } from "../humanAnnotations.types";
import PreviewCsvStep from "./previewCsvStep";
import SelectCsvStep from "./selectCsvStep";

const UploadHumanAnnotationsDialog = ({
  runSetId,
  onUploadClicked,
}: {
  runSetId: string;
  onUploadClicked: (file: File, meta: AnnotationCsvMeta) => void;
}) => {
  const [step, setStep] = useState<"SELECT" | "PREVIEW">("SELECT");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvMeta, setCsvMeta] = useState<AnnotationCsvMeta | null>(null);
  const analyzeFetcher = useFetcher<{
    success: boolean;
    data: AnalysisResult;
  }>();

  const analysisResult = analyzeFetcher.data?.data ?? null;
  const isAnalyzing = analyzeFetcher.state !== "idle";

  const onDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setCsvFile(file);
    const text = await file.text();
    const meta = extractAnnotationCsvMeta(text);
    setCsvMeta(meta);

    analyzeFetcher.submit(
      JSON.stringify({
        intent: "ANALYZE_HUMAN_CSV",
        payload: {
          headers: meta.headers,
          sessionIds: meta.sessionIds,
          valuesByField: meta.valuesByField,
        },
      }),
      {
        method: "POST",
        encType: "application/json",
        action: `/api/humanAnnotations/${runSetId}`,
      },
    );

    setStep("PREVIEW");
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "text/csv": [".csv"] },
    onDrop,
    multiple: false,
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Upload Human Annotations</DialogTitle>
        <DialogDescription>
          {step === "SELECT"
            ? "Upload a CSV file containing human-coded annotations. Each annotator in the file will create a separate run."
            : "Review the analysis below before uploading."}
        </DialogDescription>
      </DialogHeader>
      {step === "SELECT" ? (
        <SelectCsvStep
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          isDragActive={isDragActive}
        />
      ) : (
        <PreviewCsvStep
          fileName={csvFile?.name ?? ""}
          isAnalyzing={isAnalyzing}
          analysisResult={analysisResult}
        />
      )}
      <DialogFooter>
        {step === "PREVIEW" && (
          <Button variant="secondary" onClick={() => setStep("SELECT")}>
            Back
          </Button>
        )}
        {step === "SELECT" ? (
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
        ) : (
          <DialogClose asChild>
            <Button
              disabled={
                isAnalyzing ||
                !analysisResult ||
                analysisResult.matchedSessions.length === 0 ||
                analysisResult.missingSessionNames.length > 0 ||
                analysisResult.invalidValues.length > 0
              }
              onClick={() => {
                if (csvFile && csvMeta) {
                  onUploadClicked(csvFile, csvMeta);
                }
              }}
            >
              Upload & Process
            </Button>
          </DialogClose>
        )}
      </DialogFooter>
    </DialogContent>
  );
};

export default UploadHumanAnnotationsDialog;
