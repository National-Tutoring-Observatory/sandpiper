import find from "lodash/find";
import get from "lodash/get";
import { useEffect, useState } from "react";
import { useFetcher, useParams } from "react-router";
import type { PromptReference } from "~/modules/runSets/runSets.types";
import PromptSelector from "../components/promptSelector";
import type { PromptVersion } from "../prompts.types";

export default function PromptSelectorContainer({
  annotationType,
  selectedPrompt,
  selectedPromptVersion,
  selectedPrompts,
  onSelectedPromptChanged,
  onSelectedPromptVersionChanged,
}: {
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

  const { teamId } = useParams();
  const promptsFetcher = useFetcher();
  const promptVersionsFetcher = useFetcher();

  const buildPromptsListUrl = () => {
    const params = new URLSearchParams();
    params.set("annotationType", annotationType);
    if (teamId) params.set("team", teamId);
    return `/api/promptsList?${params.toString()}`;
  };

  const onPromptsPopoverOpened = () => {
    promptsFetcher.load(buildPromptsListUrl());
  };

  useEffect(() => {
    promptsFetcher.load(buildPromptsListUrl());

    if (selectedPrompt) {
      const versionParams = new URLSearchParams();
      versionParams.set("annotationType", annotationType);
      versionParams.set("prompt", selectedPrompt);
      promptVersionsFetcher.load(
        `/api/promptVersionsList?${versionParams.toString()}`,
      );
    }
  }, [selectedPrompt]);

  const onSelectedPromptChange = (selectedPrompt: string) => {
    const selectedPromptItem = find(promptsFetcher.data.prompts.data, {
      _id: selectedPrompt,
    });
    onSelectedPromptChanged(selectedPrompt, selectedPromptItem?.name);
    const params = new URLSearchParams();
    params.set("prompt", selectedPrompt);
    promptVersionsFetcher.load(`/api/promptVersionsList?${params.toString()}`);
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

  const prompts = get(promptsFetcher, "data.prompts.data", []);

  const promptVersions: PromptVersion[] = get(
    promptVersionsFetcher,
    "data.promptVersions.data",
    [],
  );

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
    const selectedPromptItem = find(promptsFetcher.data?.prompts?.data, {
      _id: selectedPrompt,
    });
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
      isLoadingPrompts={promptsFetcher.state === "loading"}
      isLoadingPromptVersions={promptVersionsFetcher.state === "loading"}
      onPromptsPopoverOpened={onPromptsPopoverOpened}
      onSelectedPromptChange={onSelectedPromptChange}
      onSelectedPromptVersionChange={onSelectedPromptVersionChange}
    />
  );
}
