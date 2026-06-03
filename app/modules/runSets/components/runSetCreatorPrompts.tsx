import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import PromptSelectorContainer from "~/modules/prompts/containers/promptSelectorContainer";
import type { PromptReference } from "~/modules/runSets/runSets.types";

export default function RunSetPromptsField({
  teamId,
  annotationType,
  selectedPrompts,
  onPromptsChanged,
}: {
  teamId: string;
  annotationType: string;
  selectedPrompts: PromptReference[];
  onPromptsChanged: (prompts: PromptReference[]) => void;
}) {
  const [tempPromptId, setTempPromptId] = useState<string | null>(null);
  const [tempPromptName, setTempPromptName] = useState<string | null>(null);
  const [tempPromptVersion, setTempPromptVersion] = useState<number | null>(
    null,
  );
  const [tempPromptInputTokens, setTempPromptInputTokens] = useState<
    number | undefined
  >(undefined);

  const onAddPrompt = () => {
    if (!tempPromptId || !tempPromptName || tempPromptVersion == null) return;

    const newPrompt: PromptReference = {
      promptId: tempPromptId,
      promptName: tempPromptName,
      version: tempPromptVersion,
      inputTokens: tempPromptInputTokens,
    };

    if (
      !selectedPrompts.some(
        (p) => p.promptId === tempPromptId && p.version === tempPromptVersion,
      )
    ) {
      onPromptsChanged([...selectedPrompts, newPrompt]);
    }

    setTempPromptId(null);
    setTempPromptName(null);
    setTempPromptVersion(null);
    setTempPromptInputTokens(undefined);
  };

  const onRemovePrompt = (promptId: string, version: number) => {
    onPromptsChanged(
      selectedPrompts.filter(
        (p) => !(p.promptId === promptId && p.version === version),
      ),
    );
  };

  return (
    <div className="space-y-2">
      <Label className="font-bold">Prompts</Label>
      <div className="space-y-3">
        <div className="space-y-2">
          <PromptSelectorContainer
            teamId={teamId}
            annotationType={annotationType}
            selectedPrompt={tempPromptId}
            selectedPromptVersion={tempPromptVersion}
            selectedPrompts={selectedPrompts}
            onSelectedPromptChanged={(id, name) => {
              setTempPromptId(id);
              setTempPromptName(name || null);
            }}
            onSelectedPromptVersionChanged={(version, inputTokens) => {
              setTempPromptVersion(version);
              setTempPromptInputTokens(inputTokens);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onAddPrompt}
            disabled={
              !tempPromptId ||
              tempPromptVersion == null ||
              selectedPrompts.some(
                (p) =>
                  p.promptId === tempPromptId &&
                  p.version === tempPromptVersion,
              )
            }
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Prompt
          </Button>
        </div>

        {selectedPrompts.length > 0 && (
          <div className="space-y-2 border-t pt-2">
            {selectedPrompts.map((prompt) => (
              <div
                key={`${prompt.promptId}-${prompt.version}`}
                className="bg-background flex items-center justify-between rounded p-2"
              >
                <span className="text-sm">
                  {prompt.promptName} (v{prompt.version})
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onRemovePrompt(prompt.promptId, prompt.version)
                  }
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
