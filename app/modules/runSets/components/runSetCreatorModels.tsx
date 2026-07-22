import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { findModelByCode } from "~/modules/llm/modelRegistry";
import ModelSelectorContainer from "~/modules/prompts/containers/modelSelectorContainer";

export default function RunSetModelsField({
  selectedModels,
  onModelsChanged,
}: {
  selectedModels: string[];
  onModelsChanged: (models: string[]) => void;
}) {
  const [tempModel, setTempModel] = useState<string>("");

  const onAddModel = () => {
    if (!tempModel || selectedModels.includes(tempModel)) return;
    onModelsChanged([...selectedModels, tempModel]);
    setTempModel("");
  };

  const onRemoveModel = (model: string) => {
    onModelsChanged(selectedModels.filter((m) => m !== model));
  };

  return (
    <div className="space-y-2">
      <Label className="font-bold">Models</Label>
      <div className="space-y-3">
        <div className="space-y-2">
          <ModelSelectorContainer
            selectedModel={tempModel}
            excludeModels={selectedModels}
            onSelectedModelChanged={setTempModel}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddModel}
            disabled={!tempModel || selectedModels.includes(tempModel)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Model
          </Button>
        </div>

        {selectedModels.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            {selectedModels.map((model) => (
              <div
                key={model}
                className="bg-background flex items-center justify-between rounded p-2"
              >
                <span className="text-body">
                  {findModelByCode(model)?.name ?? model}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRemoveModel(model)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
