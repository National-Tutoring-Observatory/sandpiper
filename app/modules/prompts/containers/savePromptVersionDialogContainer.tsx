import { useEffect, useRef, useState } from "react";
import useCache from "~/modules/cache/hooks/useCache";
import SavePromptVersionDialog from "../components/savePromptVersionDialog";

type AlignmentResult = {
  alignmentScore: number;
  reasoning: string;
  hasInjectionError?: boolean;
  injectionReasoning?: string;
};

type SuggestionsResult = {
  prompt: string;
  annotationSchema: [];
};

export default function SavePromptVersionDialogContainer({
  userPrompt,
  annotationSchema,
  teamId,
  promptId,
  onSaveClicked,
  onAcceptChangesClicked,
}: {
  userPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationSchema: any[];
  teamId: string;
  promptId: string;
  onSaveClicked: () => void;
  onAcceptChangesClicked: (changes: {
    suggestedPrompt: string;
    suggestedAnnotationSchema: [];
  }) => void;
}) {
  const hasInitialized = useRef(false);

  const [hasRequestedSuggestions, setHasRequestedSuggestions] = useState(false);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestionsResult | null>(
    null,
  );
  const [error, setError] = useState("");

  const teamQuery = { teamId };
  const prompt = useCache({
    api: `/api/prompts/${promptId}`,
    query: teamQuery,
  });

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    prompt.mutate(
      {
        api: `/api/prompts/${promptId}/alignment-check`,
        method: "POST",
        query: teamQuery,
        data: { userPrompt, annotationSchema },
      },
      {
        onSuccess: (response) => setAlignment(response.data),
        onError: (error) => setError(error.message),
      },
    );
  }, []);

  const onGetSuggestionsClicked = () => {
    setHasRequestedSuggestions(true);
    prompt.mutate(
      {
        api: `/api/prompts/${promptId}/alignment-suggestions`,
        method: "POST",
        query: teamQuery,
        data: {
          userPrompt,
          annotationSchema,
          alignmentScore: alignment?.alignmentScore,
          reasoning: alignment?.reasoning,
        },
      },
      {
        onSuccess: (response) => setSuggestions(response.data),
        onError: (error) => setError(error.message),
      },
    );
  };

  const isFetchingAlignment = !alignment && !error;
  const isFetchingSuggestions =
    hasRequestedSuggestions && !suggestions && !error;
  const isMatching = (alignment?.alignmentScore ?? 0) >= 0.8;
  const hasInjectionError = alignment?.hasInjectionError === true;
  const injectionReasoning = alignment?.injectionReasoning ?? "";
  const isSubmitButtonDisabled = !isMatching || hasInjectionError || !!error;
  const reasoning = alignment?.reasoning ?? "";

  return (
    <SavePromptVersionDialog
      error={error}
      reasoning={reasoning}
      injectionReasoning={injectionReasoning}
      suggestedPrompt={suggestions?.prompt ?? ""}
      suggestedAnnotationSchema={suggestions?.annotationSchema ?? []}
      isSubmitButtonDisabled={isSubmitButtonDisabled}
      isFetchingAlignment={isFetchingAlignment}
      isFetchingSuggestions={isFetchingSuggestions}
      isMatching={isMatching}
      hasInjectionError={hasInjectionError}
      hasRequestedSuggestions={hasRequestedSuggestions}
      onSaveClicked={onSaveClicked}
      onAcceptChangesClicked={onAcceptChangesClicked}
      onGetSuggestionsClicked={onGetSuggestionsClicked}
    />
  );
}
