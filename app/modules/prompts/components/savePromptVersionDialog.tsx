import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CircleAlert, CircleCheck, LoaderPinwheel } from "lucide-react";
import AnnotationSchemaViewer from "./annotationSchemaViewer";

const SavePromptVersionDialog = ({
  error,
  reasoning,
  injectionReasoning,
  suggestedPrompt,
  suggestedAnnotationSchema,
  hasRequestedSuggestions,
  isSubmitButtonDisabled,
  isFetchingAlignment,
  isFetchingSuggestions,
  isMatching,
  hasInjectionError,
  onSaveClicked,
  onAcceptChangesClicked,
  onGetSuggestionsClicked,
}: {
  error: string;
  reasoning: string;
  injectionReasoning: string;
  suggestedPrompt: string;
  suggestedAnnotationSchema: [];
  hasRequestedSuggestions: boolean;
  isSubmitButtonDisabled: boolean;
  isFetchingAlignment: boolean;
  isFetchingSuggestions: boolean;
  isMatching: boolean;
  hasInjectionError: boolean;
  onSaveClicked: () => void;
  onAcceptChangesClicked: (changes: {
    suggestedPrompt: string;
    suggestedAnnotationSchema: [];
  }) => void;
  onGetSuggestionsClicked: () => void;
}) => {
  return (
    <DialogContent className="flex max-h-[90vh] min-w-3xl flex-col">
      <DialogHeader>
        <DialogTitle>Save prompt version</DialogTitle>
        <DialogDescription>
          Are you sure you want to save this prompt version? Saving this version
          will stop edits from being made to this version. You can always create
          a new prompt version.
        </DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-4 overflow-y-auto">
        <div>
          {error && (
            <Alert>
              <CircleAlert className="stroke-red-500" />
              <AlertTitle>Alignment check failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && isFetchingAlignment && (
            <Alert className="flex">
              <LoaderPinwheel className="animate-spin" />
              <AlertDescription>
                Checking for prompt and schema alignment.
                <br />
                <span className="text-xs">
                  This can take a while as we check your prompt and schema.
                </span>
              </AlertDescription>
            </Alert>
          )}
          {!error && isFetchingSuggestions && (
            <Alert className="flex">
              <LoaderPinwheel className="animate-spin" />
              <AlertDescription>
                Fetching suggestions for prompt and schema alignment.
                <br />
                <span className="text-xs">
                  This can take a while as we write some suggestions.
                </span>
              </AlertDescription>
            </Alert>
          )}
          {!error &&
            !isFetchingAlignment &&
            !isFetchingSuggestions &&
            isMatching &&
            !hasInjectionError && (
              <Alert>
                <CircleCheck className="stroke-green-500" />
                <AlertTitle>Prompt and schema are aligned!</AlertTitle>
              </Alert>
            )}
          {!error &&
            !isFetchingAlignment &&
            !isFetchingSuggestions &&
            !isMatching && (
              <Alert>
                <CircleAlert className="stroke-red-500" />
                <AlertTitle>Prompt and schema are not aligned!</AlertTitle>
                <AlertDescription>{reasoning}</AlertDescription>
                {!hasRequestedSuggestions && (
                  <AlertDescription className="mt-2 text-xs font-bold">
                    Click "Get suggestions" for help on fixes to your prompt and
                    annotation schema.
                  </AlertDescription>
                )}
              </Alert>
            )}
          {!error &&
            !isFetchingAlignment &&
            !isFetchingSuggestions &&
            hasInjectionError && (
              <Alert className="mt-2">
                <CircleAlert className="stroke-red-500" />
                <AlertTitle>Possible prompt injection detected</AlertTitle>
                <AlertDescription>{injectionReasoning}</AlertDescription>
              </Alert>
            )}
        </div>
        {!error &&
          !isFetchingAlignment &&
          !isFetchingSuggestions &&
          (!isMatching || hasInjectionError) &&
          hasRequestedSuggestions && (
            <div className="space-y-2">
              <p>
                We've suggested a few changes to your prompt and annotation
                schema:
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Write your prompt here."
                    value={suggestedPrompt}
                    className="h-80"
                    disabled={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Annotation schema</Label>
                  <AnnotationSchemaViewer
                    annotationSchema={suggestedAnnotationSchema}
                  />
                </div>
              </div>
            </div>
          )}
      </div>
      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        {isMatching && !hasInjectionError && (
          <DialogClose asChild>
            <Button
              type="button"
              disabled={isSubmitButtonDisabled}
              onClick={() => {
                onSaveClicked();
              }}
            >
              Save version
            </Button>
          </DialogClose>
        )}
        {!error &&
          !isFetchingAlignment &&
          !isFetchingSuggestions &&
          !hasRequestedSuggestions &&
          (!isMatching || hasInjectionError) && (
            <Button
              type="button"
              onClick={() => {
                onGetSuggestionsClicked();
              }}
            >
              Get suggestions
            </Button>
          )}
        {!error &&
          !isFetchingAlignment &&
          !isFetchingSuggestions &&
          (!isMatching || hasInjectionError) &&
          hasRequestedSuggestions && (
            <DialogClose asChild>
              <Button
                type="button"
                onClick={() => {
                  onAcceptChangesClicked({
                    suggestedPrompt,
                    suggestedAnnotationSchema,
                  });
                }}
              >
                Accept suggestions
              </Button>
            </DialogClose>
          )}
      </DialogFooter>
    </DialogContent>
  );
};

export default SavePromptVersionDialog;
