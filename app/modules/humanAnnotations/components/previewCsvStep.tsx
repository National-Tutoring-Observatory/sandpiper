import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { AnalysisResult } from "../humanAnnotations.types";

const PreviewCsvStep = ({
  fileName,
  isAnalyzing,
  analysisResult,
}: {
  fileName: string;
  isAnalyzing: boolean;
  analysisResult: AnalysisResult | null;
}) => {
  if (isAnalyzing) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground text-body ml-2">
          Analyzing CSV...
        </span>
      </div>
    );
  }

  if (!analysisResult) return null;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-2">
        <Label>File</Label>
        <p className="text-body">{fileName}</p>
      </div>
      <div className="grid gap-2">
        <Label>
          Annotators ({analysisResult.annotators.length} runs will be created)
        </Label>
        <div className="flex flex-wrap gap-1">
          {analysisResult.annotators.map((name) => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Sessions</Label>
        <p className="text-body">
          {analysisResult.matchedSessions.length} matched
          {analysisResult.unmatchedSessionIds.length > 0 && (
            <span className="text-muted-foreground">
              {" "}
              · {analysisResult.unmatchedSessionIds.length} unmatched
            </span>
          )}
        </p>
      </div>
      {analysisResult.unmatchedSessionIds.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="wrap-break-word">
              {analysisResult.unmatchedSessionIds.length} session(s) in the CSV
              did not match any sessions in this run set:{" "}
              {analysisResult.unmatchedSessionIds.join(", ")}. These will be
              skipped.
            </span>
          </AlertDescription>
        </Alert>
      )}
      {analysisResult.matchedSessions.length === 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No sessions matched. Check that the session_id values in your CSV
            match the session names in this run set.
          </AlertDescription>
        </Alert>
      )}
      {analysisResult.missingSessionNames.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="wrap-break-word">
              {analysisResult.missingSessionNames.length} session(s) in the run
              set are missing from the CSV:{" "}
              {analysisResult.missingSessionNames.join(", ")}. All sessions must
              be present in the CSV.
            </span>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label>Annotation Fields</Label>
        <div className="flex flex-wrap gap-1">
          {analysisResult.annotationFields.map((field) => (
            <Badge key={field} variant="outline">
              {field}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewCsvStep;
