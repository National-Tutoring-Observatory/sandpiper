import { Empty, EmptyContent, EmptyTitle } from "@/components/ui/empty";
import { AlertTriangle, Plus, X } from "lucide-react";
import { findModelByCode } from "~/modules/llm/modelRegistry";
import { generateRunName } from "~/modules/runSets/helpers/generateRunName";
import type { RunDefinition } from "~/modules/runSets/runSets.types";

interface RunSetRunPreviewProps {
  name: string;
  runDefinitions: RunDefinition[];
  excludedDefinitions?: RunDefinition[];
  duplicateDefinitions?: RunDefinition[];
  sessionsCount: number;
  onRemoveCard: (key: string) => void;
  onRestoreCard: (key: string) => void;
}

export default function RunSetRunPreview({
  name,
  runDefinitions,
  excludedDefinitions = [],
  duplicateDefinitions = [],
  sessionsCount,
  onRemoveCard,
  onRestoreCard,
}: RunSetRunPreviewProps) {
  const hasContent =
    runDefinitions.length > 0 ||
    excludedDefinitions.length > 0 ||
    duplicateDefinitions.length > 0;

  return (
    <div
      className="bg-muted sticky top-4 min-w-0 flex-1 self-start overflow-y-auto rounded-lg border"
      style={{ height: "calc(100vh - 144px)" }}
    >
      {hasContent ? (
        <div className="space-y-4">
          <div className="bg-background sticky top-0 rounded-t-lg border-b px-4 py-4">
            <h3 className="text-heading mb-2 font-semibold">Run Preview</h3>
            <p className="text-muted-foreground text-caption">
              {runDefinitions.length} run(s) • {sessionsCount} session(s)
              {excludedDefinitions.length > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  • {excludedDefinitions.length} excluded
                </span>
              )}
              {duplicateDefinitions.length > 0 && (
                <span className="text-sandpiper-warning">
                  {" "}
                  • {duplicateDefinitions.length} duplicate(s) will be skipped
                </span>
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4 2xl:grid-cols-3">
            {runDefinitions.map((definition) => (
              <div
                key={definition.key}
                className="group bg-background text-body relative rounded-lg border p-3"
              >
                <button
                  type="button"
                  onClick={() => onRemoveCard(definition.key)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 rounded p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <p className="text-muted-foreground text-caption mb-2 font-medium">
                  New Run
                </p>
                <RunDefinitionCardDetails name={name} definition={definition} />
              </div>
            ))}
            {excludedDefinitions.map((definition) => (
              <div
                key={definition.key}
                className="group bg-muted text-body relative rounded-lg border border-dashed p-3 opacity-50"
              >
                <button
                  type="button"
                  onClick={() => onRestoreCard(definition.key)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-2 right-2 rounded p-0.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <p className="text-muted-foreground text-caption mb-2 font-medium">
                  Excluded
                </p>
                <RunDefinitionCardDetails name={name} definition={definition} />
              </div>
            ))}
            {duplicateDefinitions.map((definition) => (
              <div
                key={definition.key}
                className="border-sandpiper-warning/20 bg-sandpiper-warning/5 text-body rounded-lg border p-3 opacity-60"
              >
                <div className="text-sandpiper-warning text-caption mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Already exists
                </div>
                <p className="text-muted-foreground text-caption mb-2 font-medium">
                  Skipped
                </p>
                <RunDefinitionCardDetails name={name} definition={definition} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="sticky top-8 p-8">
          <Empty className="border">
            <EmptyContent>
              <EmptyTitle>Select prompts and models to preview runs</EmptyTitle>
            </EmptyContent>
          </Empty>
        </div>
      )}
    </div>
  );
}

function RunDefinitionCardDetails({
  name,
  definition,
}: {
  name: string;
  definition: RunDefinition;
}) {
  return (
    <div className="space-y-1">
      <div>
        <p className="text-muted-foreground text-caption">Name</p>
        <p className="text-caption truncate font-mono">
          {generateRunName(name, definition.prompt, definition.modelCode)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-caption">Prompt</p>
        <p className="text-caption truncate font-mono">
          {definition.prompt.promptName || definition.prompt.promptId} (v
          {definition.prompt.version})
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-caption">Model</p>
        <p className="text-caption truncate font-mono">
          {findModelByCode(definition.modelCode)?.name ?? definition.modelCode}
        </p>
      </div>
    </div>
  );
}
