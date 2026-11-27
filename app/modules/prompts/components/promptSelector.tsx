import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import clsx from "clsx";
import find from "lodash/find";
import {
  BookCheck,
  CheckIcon,
  ChevronsUpDownIcon,
  ViewIcon,
} from "lucide-react";
import { useState } from "react";
import type { Prompt, PromptVersion } from "../prompts.types";

export default function PromptSelector({
  prompts,
  promptVersions,
  selectedPrompt,
  selectedPromptVersion,
  productionVersion,
  isLoadingPrompts,
  isLoadingPromptVersions,
  onPromptsPopoverOpened,
  onSelectedPromptChange,
  onSelectedPromptVersionChange,
}: {
  prompts: Prompt[];
  promptVersions: PromptVersion[];
  selectedPrompt: string | null;
  selectedPromptVersion: number | null;
  productionVersion: number | null;
  isLoadingPrompts: boolean;
  isLoadingPromptVersions: boolean;
  onPromptsPopoverOpened: () => void;
  onSelectedPromptChange: (selectedPrompt: string) => void;
  onSelectedPromptVersionChange: (selectedPromptVersion: number) => void;
}) {
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isPromptVersionsOpen, setIsPromptVersionsOpen] = useState(false);

  let selectedPromptVersionItem = null;
  if (selectedPromptVersion) {
    selectedPromptVersionItem = find(promptVersions, {
      version: Number(selectedPromptVersion),
    });
  }

  return (
    <div className="flex items-center">
      <Popover
        open={isPromptsOpen}
        onOpenChange={(open) => {
          setIsPromptsOpen(open);
          if (open) onPromptsPopoverOpened();
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isPromptsOpen}
            className="w-[200px] justify-between"
          >
            {selectedPrompt
              ? prompts.find((prompt: Prompt) => prompt._id === selectedPrompt)
                  ?.name
              : "Select prompt..."}
            <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search prompts..." />
            <CommandList>
              {isLoadingPrompts && (
                <div className="flex justify-center">Loading</div>
              )}
              {!isLoadingPrompts && (
                <CommandEmpty>
                  <div>No prompts found.</div>
                  {/* <Button >Create</Button> */}
                </CommandEmpty>
              )}
              <CommandGroup>
                {prompts.map((prompt: Prompt) => (
                  <CommandItem
                    key={prompt._id}
                    value={prompt.name}
                    keywords={[prompt._id]}
                    onSelect={() => {
                      onSelectedPromptChange(prompt._id);
                      setIsPromptsOpen(false);
                    }}
                  >
                    <CheckIcon
                      className={clsx(
                        "mr-2 h-4 w-4",
                        selectedPrompt === prompt._id
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {prompt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedPrompt && (
        <div className="ml-2">
          <Popover
            open={isPromptVersionsOpen}
            onOpenChange={setIsPromptVersionsOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isPromptVersionsOpen}
                className="w-[200px] justify-between"
              >
                {(selectedPromptVersion && selectedPromptVersionItem && (
                  <div className="flex items-center">
                    {`#${selectedPromptVersionItem.version}`}
                    {productionVersion &&
                      productionVersion ===
                        selectedPromptVersionItem.version && (
                        <Badge
                          variant="secondary"
                          className="bg-sandpiper-accent/15 ml-2"
                        >
                          <BookCheck className="size-3" />
                          Production
                        </Badge>
                      )}
                  </div>
                )) ||
                  "Select version..."}
                <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search versions..." />
                <CommandList>
                  {isLoadingPromptVersions && (
                    <div className="flex justify-center">Loading</div>
                  )}
                  {!isLoadingPromptVersions && (
                    <CommandEmpty>
                      <div>No versions found.</div>
                      <Button>Create</Button>
                    </CommandEmpty>
                  )}
                  <CommandGroup>
                    {promptVersions.map((promptVersion: PromptVersion) => (
                      <CommandItem
                        key={promptVersion._id}
                        value={`#${promptVersion.version} ${promptVersion.name}`}
                        keywords={[
                          `${promptVersion.version}`,
                          promptVersion.name,
                        ]}
                        onSelect={() => {
                          onSelectedPromptVersionChange(promptVersion.version);
                          setIsPromptVersionsOpen(false);
                        }}
                      >
                        <CheckIcon
                          className={clsx(
                            "mr-2 h-4 w-4",
                            selectedPromptVersion === promptVersion.version
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div>
                          {`#${promptVersion.version}`}
                          {productionVersion &&
                            productionVersion === promptVersion.version && (
                              <Badge
                                variant="secondary"
                                className="bg-sandpiper-accent/15 ml-2"
                              >
                                <BookCheck className="size-3" />
                                Production
                              </Badge>
                            )}
                          <div className="text-muted-foreground">
                            {promptVersion.name}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      )}
      {selectedPrompt && selectedPromptVersion && selectedPromptVersionItem && (
        <div className="ml-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="secondary" aria-label="View prompt">
                <ViewIcon />
              </Button>
            </SheetTrigger>
            <SheetContent className="!max-w-1/2 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Selected prompt version</SheetTitle>
                <div className="mb-[-1px] inline-flex items-center rounded-t-md border p-2">
                  {`#${selectedPromptVersionItem.version}`}
                  {productionVersion &&
                    productionVersion === selectedPromptVersionItem.version && (
                      <Badge
                        variant="secondary"
                        className="bg-sandpiper-accent/15 ml-2"
                      >
                        <BookCheck />
                        Production
                      </Badge>
                    )}
                </div>
                <Textarea
                  disabled
                  className="max-h-[calc(100vh-120px)] !rounded-tl-none !opacity-100"
                >
                  {selectedPromptVersionItem?.userPrompt}
                </Textarea>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
