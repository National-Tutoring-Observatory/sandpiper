import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  BookCheck,
  BookOpen,
  ExternalLink,
  Save,
  UnfoldVertical,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { codebookUrl } from "~/modules/codebooks/helpers/codebookUrls";
import type { AnnotationSchemaItem, PromptVersion } from "../prompts.types";
import AnnotationSchemaBuilder from "./annotationSchemaBuilder";

export default function PromptEditor({
  promptVersion,
  codebook,
  systemPrompt,
  isLoading,
  isProduction,
  isSystemPromptVisible,
  onSavePromptVersion,
  onMakePromptVersionProduction,
  onToggleSystemPromptClicked,
}: {
  promptVersion: PromptVersion;
  codebook: {
    _id: string;
    name: string;
    version: number;
    teamId: string;
  } | null;
  systemPrompt: string;
  isLoading: boolean;
  isProduction: boolean;
  isSystemPromptVisible: boolean;
  onSavePromptVersion: ({
    name,
    userPrompt,
    annotationSchema,
  }: {
    name: string;
    userPrompt: string;
    annotationSchema: AnnotationSchemaItem[];
  }) => void;
  onMakePromptVersionProduction: () => void;
  onToggleSystemPromptClicked: () => void;
}) {
  const [hasChanges, setHasChanges] = useState(!!promptVersion.userPrompt);
  const [name, setName] = useState(promptVersion.name);
  const [userPrompt, setUserPrompt] = useState(promptVersion.userPrompt || "");
  const [annotationSchema, setAnnotationSchema] = useState<
    AnnotationSchemaItem[]
  >(promptVersion.annotationSchema);

  const onNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHasChanges(true);
    setName(event.target.value);
  };

  const onUserPromptChanged = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setHasChanges(true);
    setUserPrompt(event.target.value);
  };

  const onAnnotationSchemaChanged = (
    annotationSchema: AnnotationSchemaItem[],
  ) => {
    setHasChanges(true);
    setAnnotationSchema(annotationSchema);
  };

  const onSavePromptVersionClicked = () => {
    onSavePromptVersion({ name, userPrompt, annotationSchema });
  };

  const onMakePromptVersionProductionClicked = () => {
    onMakePromptVersionProduction();
  };

  return (
    <div className="border-l">
      <div className="flex items-center justify-between border-b p-2 text-sm">
        <div className="flex items-center gap-3">
          <div>{`Version: ${promptVersion.name}`}</div>
          {codebook && (
            <Link
              to={codebookUrl(codebook.teamId, codebook._id, codebook.version)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
            >
              <BookOpen className="h-3 w-3" />
              Built from {codebook.name}
            </Link>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {!isProduction && promptVersion.hasBeenSaved && (
            <Button
              variant="ghost"
              className="hover:text-sandpiper-accent cursor-pointer"
              onClick={onMakePromptVersionProductionClicked}
            >
              <BookCheck />
              Make production version
            </Button>
          )}
          {!promptVersion.hasBeenSaved && (
            <Button
              variant="ghost"
              className="hover:text-sandpiper-accent cursor-pointer"
              disabled={!hasChanges || isLoading}
              onClick={onSavePromptVersionClicked}
            >
              <Save />
              Save prompt version
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-8 p-8">
        <div className="grid gap-3">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            disabled={promptVersion.hasBeenSaved}
            autoComplete="off"
            onChange={onNameChanged}
          />
        </div>
        {isSystemPromptVisible && (
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="system-prompt">System Prompt</Label>
            </div>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              className="h-80 overscroll-none bg-amber-100 text-black"
              disabled={true}
            />
          </div>
        )}
        <div className="grid gap-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="prompt">Prompt</Label>
            <div className="flex items-center gap-x-4">
              <Button
                className="text-muted-foreground hover:text-foreground"
                variant="link"
                asChild
              >
                <a
                  href="https://docs.google.com/document/d/1Rf2p3ltWSCk3VTeuTtXTpVu7NkrAi8yNDloYLId-KU8/edit?tab=t.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  Prompt writing guide
                </a>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={onToggleSystemPromptClicked}
              >
                <UnfoldVertical className="h-3 w-3 text-xs" size="2" />
                {isSystemPromptVisible
                  ? `Hide system prompt`
                  : `View system prompt`}
              </Button>
            </div>
          </div>
          <Textarea
            id="prompt"
            placeholder="Write your prompt here."
            value={userPrompt}
            className="h-80"
            disabled={promptVersion.hasBeenSaved}
            onChange={onUserPromptChanged}
          />
        </div>
        <div className="grid gap-3">
          <Label htmlFor="prompt">Annotation schema</Label>
          <AnnotationSchemaBuilder
            annotationSchema={annotationSchema}
            hasBeenSaved={promptVersion.hasBeenSaved}
            onAnnotationSchemaChanged={onAnnotationSchemaChanged}
          />
        </div>
      </div>
    </div>
  );
}
