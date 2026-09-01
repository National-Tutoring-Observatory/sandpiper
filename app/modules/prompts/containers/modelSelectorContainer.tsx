import { useState } from "react";
import useLlmProvider from "~/modules/llm/hooks/useLlmProvider";
import { getAvailableProviders } from "~/modules/llm/modelRegistry";
import ModelSelector from "../components/modelSelector";

export default function ModelSelectorContainer({
  selectedModel,
  excludeModels = [],
  onSelectedModelChanged,
}: {
  selectedModel: string;
  excludeModels?: string[];
  onSelectedModelChanged: (selectedModel: string) => void;
}) {
  const [isModelsOpen, setIsModelsOpen] = useState(false);
  const llmProvider = useLlmProvider();

  const onToggleModelPopover = (isModelsOpen: boolean) => {
    setIsModelsOpen(isModelsOpen);
  };

  const providers = getAvailableProviders(llmProvider);

  const providersWithFilteredModels = providers.map((provider) => ({
    ...provider,
    models: provider.models.filter((m) => !excludeModels.includes(m.code)),
  }));

  const nonEmptyProviders = providersWithFilteredModels.filter(
    (provider) => provider.models.length > 0,
  );

  return (
    <ModelSelector
      providers={nonEmptyProviders}
      selectedModel={selectedModel}
      isModelsOpen={isModelsOpen}
      onToggleModelPopover={onToggleModelPopover}
      onSelectedModelChanged={onSelectedModelChanged}
    />
  );
}
