import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Info } from "lucide-react";

import type { AnnotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import AnnotationTypeSelectorContainer from "~/modules/prompts/containers/annoationTypeSelectorContainer";
import ModelSelectorContainer from "~/modules/prompts/containers/modelSelectorContainer";
import PromptSelectorContainer from "~/modules/prompts/containers/promptSelectorContainer";
import EstimateInfoBox from "~/modules/runSets/components/estimateInfoBox";
import EstimateSummary from "~/modules/runSets/components/estimateSummary";
import InsufficientCreditsAlert from "~/modules/runSets/components/insufficientCreditsAlert";
import type { EstimationResult } from "~/modules/runSets/runSets.types";
import SessionSelectorContainer from "~/modules/sessions/containers/sessionSelectorContainer";
import type { SessionData } from "~/modules/sessions/sessions.types";
import RunValidationAlert from "./runValidationAlert";

export default function RunCreator({
  teamId,
  duplicateWarnings = [],
  runName,
  selectedAnnotationType,
  selectedPrompt,
  selectedPromptVersion,
  selectedModel,
  selectedSessions,
  estimation,
  balance,
  exceedsBalance,
  isSubmitting,
  isRunButtonDisabled,
  onRunNameChanged,
  onSelectedAnnotationTypeChanged,
  onSelectedPromptChanged,
  onSelectedPromptVersionChanged,
  onSelectedModelChanged,
  onSelectedSessionsChanged,
  shouldRunVerification,
  onShouldRunVerificationChanged,
  onStartRunButtonClicked,
}: {
  teamId: string;
  duplicateWarnings?: string[];
  runName: string;
  selectedAnnotationType: AnnotationTypeOptions;
  selectedPrompt: string | null;
  selectedPromptVersion: number | null;
  selectedModel: string;
  selectedSessions: string[];
  estimation: EstimationResult;
  balance: number;
  exceedsBalance: boolean;
  isSubmitting: boolean;
  isRunButtonDisabled: boolean;
  onRunNameChanged: (name: string) => void;
  onSelectedAnnotationTypeChanged: (selectedAnnotationType: string) => void;
  onSelectedPromptChanged: (selectedPrompt: string) => void;
  onSelectedPromptVersionChanged: (
    selectedPromptVersion: number,
    inputTokens?: number,
  ) => void;
  onSelectedModelChanged: (selectedModel: string) => void;
  onSelectedSessionsChanged: (sessions: SessionData[]) => void;
  shouldRunVerification: boolean;
  onShouldRunVerificationChanged: (value: boolean) => void;
  onStartRunButtonClicked: () => void;
}) {
  return (
    <div className="mx-0 w-full max-w-3xl pt-4 pb-8">
      {duplicateWarnings.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Some settings are no longer available</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc">
              {duplicateWarnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Name your run</CardTitle>
          <CardDescription>
            Give your run a descriptive name to make it easier to find later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={runName}
              autoComplete="off"
              onChange={(e) => onRunNameChanged(e.target.value)}
              className="w-96"
              autoFocus
            />
          </div>
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select annotation type</CardTitle>
          <CardDescription>
            Choose how you want to annotate data. This affects available prompts
            and models.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AnnotationTypeSelectorContainer
            annotationType={selectedAnnotationType}
            onSelectedAnnotationTypeChanged={onSelectedAnnotationTypeChanged}
          />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select a prompt</CardTitle>
          <CardDescription>
            Pick a prompt and version the model will use to annotate the data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PromptSelectorContainer
            teamId={teamId}
            annotationType={selectedAnnotationType}
            selectedPrompt={selectedPrompt}
            selectedPromptVersion={selectedPromptVersion}
            onSelectedPromptChanged={onSelectedPromptChanged}
            onSelectedPromptVersionChanged={onSelectedPromptVersionChanged}
          />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Select a model</CardTitle>
          <CardDescription>
            Select which AI model will be used for annotation. Different models
            may yield different results.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSelectorContainer
            selectedModel={selectedModel}
            onSelectedModelChanged={onSelectedModelChanged}
          />
        </CardContent>
      </Card>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Verification</CardTitle>
          <CardDescription>
            When enabled, annotations are verified by a second LLM pass to check
            for accuracy. This significantly improves results but roughly
            doubles the cost on average.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Checkbox
              id="shouldRunVerification"
              checked={shouldRunVerification}
              onCheckedChange={(checked) =>
                onShouldRunVerificationChanged(Boolean(checked))
              }
            />
            <Label htmlFor="shouldRunVerification">
              Enable verification step
            </Label>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Select sessions</CardTitle>
          <CardDescription>
            Choose which sessions to annotate. You can select manually or use
            the randomizer to pick a sample.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionSelectorContainer
            selectedSessions={selectedSessions}
            onSelectedSessionsChanged={onSelectedSessionsChanged}
          />
          <div className="mt-4 space-y-3">
            {runName.trim().length < 3 ||
            !selectedPrompt ||
            !selectedPromptVersion ||
            selectedSessions.length === 0 ? (
              <RunValidationAlert
                runName={runName}
                selectedPrompt={selectedPrompt}
                selectedPromptVersion={selectedPromptVersion}
                selectedSessions={selectedSessions}
              />
            ) : (
              <EstimateInfoBox>
                <div className="flex justify-end">
                  <EstimateSummary estimation={estimation} balance={balance} />
                </div>
              </EstimateInfoBox>
            )}
            <InsufficientCreditsAlert exceedsBalance={exceedsBalance} />
            <div className="flex justify-end">
              <Button
                disabled={isRunButtonDisabled}
                onClick={onStartRunButtonClicked}
              >
                {isSubmitting ? "Starting run..." : "Start run"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
