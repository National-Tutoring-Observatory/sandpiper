import find from "lodash/find";
import { useEffect, useState } from "react";
import useCache from "~/modules/cache/hooks/useCache";
import type { PromptReference } from "~/modules/runSets/runSets.types";
import PromptSelector from "../components/promptSelector";
import type { Prompt, PromptVersion } from "../prompts.types";

export default function PromptSelectorContainer({
  teamId,
  annotationType,
  selectedPrompt,
  selectedPromptVersion,
  selectedPrompts,
  onSelectedPromptChanged,
  onSelectedPromptVersionChanged,
}: {
  teamId: string;
  annotationType: string;
  selectedPrompt: string | null;
  selectedPromptVersion: number | null;
  selectedPrompts?: PromptReference[];
  onSelectedPromptChanged: (
    selectedPrompt: string,
    selectedPromptName?: string,
  ) => void;
  onSelectedPromptVersionChanged: (
    selectedPromptVersion: number,
    inputTokens?: number,
  ) => void;
}) {
  const [fetchedVersionsByPrompt, setFetchedVersionsByPrompt] = useState<
    Record<string, PromptVersion[]>
  >({});

  const teamQuery = { teamId };
  const promptsCache = useCache({
    api: "/api/prompts/saved",
    query: { ...teamQuery, annotationType },
  });
  const promptVersionsCache = useCache({
    api: `/api/prompts/${selectedPrompt}/versions`,
    query: { ...teamQuery, hasBeenSaved: true },
    enabled: !!selectedPrompt,
  });

  const onPromptsPopoverOpened = () => {
    promptsCache.fetch();
  };

  const onSelectedPromptChange = (selectedPrompt: string) => {
    const selectedPromptItem = find(prompts, { _id: selectedPrompt });
    onSelectedPromptChanged(selectedPrompt, selectedPromptItem?.name);
    if (selectedPromptItem?.productionVersion != null) {
      onSelectedPromptVersionChanged(selectedPromptItem.productionVersion);
    }
  };

  const onSelectedPromptVersionChange = (selectedPromptVersion: number) => {
    const version = promptVersions.find(
      (v) => v.version === selectedPromptVersion,
    );
    onSelectedPromptVersionChanged(selectedPromptVersion, version?.inputTokens);
  };

  const prompts: Prompt[] = promptsCache.data ?? [];

  const promptVersions: PromptVersion[] = selectedPrompt
    ? (promptVersionsCache.data ?? [])
    : [];

  useEffect(() => {
    if (selectedPrompt && promptVersions.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- accumulating cache across fetcher responses
      setFetchedVersionsByPrompt((prev) => ({
        ...prev,
        [selectedPrompt]: promptVersions,
      }));
    }
  }, [selectedPrompt, promptVersions]);

  const filteredPrompts = prompts.filter((prompt: { _id: string }) => {
    const fetchedVersions = fetchedVersionsByPrompt[prompt._id];
    if (!fetchedVersions) return true;

    const selectedForThisPrompt =
      selectedPrompts?.filter((sp) => sp.promptId === prompt._id) || [];

    return selectedForThisPrompt.length < fetchedVersions.length;
  });

  const filteredVersions = promptVersions.filter((version) => {
    return !selectedPrompts?.some(
      (sp) => sp.promptId === selectedPrompt && sp.version === version.version,
    );
  });

  let productionVersion = null;
  if (selectedPrompt) {
    const selectedPromptItem = find(prompts, { _id: selectedPrompt });
    if (selectedPromptItem) {
      productionVersion = selectedPromptItem.productionVersion;
    }
  }

  return (
    <PromptSelector
      prompts={filteredPrompts}
      promptVersions={filteredVersions}
      selectedPrompt={selectedPrompt}
      selectedPromptVersion={selectedPromptVersion}
      productionVersion={productionVersion}
      isLoadingPrompts={promptsCache.isFetching}
      isLoadingPromptVersions={promptVersionsCache.isFetching}
      onPromptsPopoverOpened={onPromptsPopoverOpened}
      onSelectedPromptChange={onSelectedPromptChange}
      onSelectedPromptVersionChange={onSelectedPromptVersionChange}
    />
  );
}
