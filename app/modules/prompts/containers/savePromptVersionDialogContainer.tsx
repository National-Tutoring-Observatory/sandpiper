import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import SavePromptVersionDialog from "../components/savePromptVersionDialog";

export default function SavePromptVersionDialogContainer({
  userPrompt,
  annotationSchema,
  team,
  promptId,
  onSaveClicked,
  onAcceptChangesClicked,
}: {
  userPrompt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  annotationSchema: any[];
  team: string;
  promptId: string;
  onSaveClicked: () => void;
  onAcceptChangesClicked: (changes: {
    suggestedPrompt: string;
    suggestedAnnotationSchema: [];
  }) => void;
}) {
  const hasInitialized = useRef(false);

  const [hasRequestedSuggestions, setHasRequestedSuggestions] = useState(false);

  const alignmentFetcher = useFetcher();
  const suggestionsFetcher = useFetcher();

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      alignmentFetcher.submit(
        {
          intent: "ALIGNMENT_CHECK",
          userPrompt,
          annotationSchema,
          team,
          promptId,
        },
        {
          action: "/api/promptVersionAlignment",
          method: "post",
          encType: "application/json",
        },
      );
    }
  }, []);

  const onGetSuggestionsClicked = () => {
    setHasRequestedSuggestions(true);
    suggestionsFetcher.submit(
      {
        intent: "SUGGEST_CHANGES",
        userPrompt,
        annotationSchema,
        team,
        promptId,
        alignmentScore: alignmentFetcher.data?.alignmentScore,
        reasoning: alignmentFetcher.data?.reasoning,
      },
      {
        action: "/api/promptVersionAlignment",
        method: "post",
        encType: "application/json",
      },
    );
  };

  const error =
    alignmentFetcher.data?.errors?.general ??
    suggestionsFetcher.data?.errors?.general ??
    "";
  const isFetchingAlignment = !alignmentFetcher.data;
  const isFetchingSuggestions =
    hasRequestedSuggestions && !suggestionsFetcher.data;
  const isMatching = alignmentFetcher.data?.alignmentScore >= 0.8;
  const hasInjectionError = alignmentFetcher.data?.hasInjectionError === true;
  const injectionReasoning = alignmentFetcher.data?.injectionReasoning ?? "";
  const isSubmitButtonDisabled = !isMatching || hasInjectionError || !!error;
  const reasoning = alignmentFetcher.data?.reasoning ?? "";

  const suggestedPrompt = suggestionsFetcher.data?.prompt ?? "";
  const suggestedAnnotationSchema =
    suggestionsFetcher.data?.annotationSchema ?? [];

  return (
    <SavePromptVersionDialog
      error={error}
      reasoning={reasoning}
      injectionReasoning={injectionReasoning}
      suggestedPrompt={suggestedPrompt}
      suggestedAnnotationSchema={suggestedAnnotationSchema}
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
