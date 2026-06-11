import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { cleanAuthors, cleanPaperRefs } from "../helpers/cleanLibraryMetadata";
import type { Prompt, PromptAuthor, PromptPaperRef } from "../prompts.types";

interface PublishPromptDialogProps {
  prompt: Prompt;
  onPublishPromptClicked: (input: {
    description: string;
    authors: PromptAuthor[];
    paperRefs: PromptPaperRef[];
  }) => void;
  isSubmitting?: boolean;
}

const PublishPromptDialog = ({
  prompt,
  onPublishPromptClicked,
  isSubmitting = false,
}: PublishPromptDialogProps) => {
  const isAlreadyPublished = Boolean(prompt.library?.isPublished);

  const [description, setDescription] = useState(
    prompt.library?.description ?? "",
  );
  const [authors, setAuthors] = useState<PromptAuthor[]>(
    prompt.library?.authors?.length
      ? prompt.library.authors
      : [{ name: "", affiliation: "" }],
  );
  const [paperRefs, setPaperRefs] = useState<PromptPaperRef[]>(
    prompt.library?.paperRefs?.length
      ? prompt.library.paperRefs
      : [{ title: "", url: "" }],
  );

  const updateAuthor = (
    index: number,
    field: keyof PromptAuthor,
    value: string,
  ) => {
    setAuthors((prev) =>
      prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
    );
  };

  const updatePaperRef = (
    index: number,
    field: keyof PromptPaperRef,
    value: string,
  ) => {
    setPaperRefs((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    );
  };

  const submit = () => {
    onPublishPromptClicked({
      description: description.trim(),
      authors: cleanAuthors(authors),
      paperRefs: cleanPaperRefs(paperRefs),
    });
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {isAlreadyPublished
            ? `Update library entry - ${prompt.name}`
            : `Publish to library - ${prompt.name}`}
        </DialogTitle>
        <DialogDescription>
          {isAlreadyPublished
            ? "Changes will appear in the library immediately for all users."
            : "Once published, any authenticated user can browse this prompt in the library and copy it into their team."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid max-h-[60vh] gap-6 overflow-y-auto py-2">
        <div className="grid gap-2">
          <Label htmlFor="library-description">Description</Label>
          <Textarea
            id="library-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this prompt does, when to use it, what to expect."
            className="min-h-24"
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Authors</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setAuthors((prev) => [...prev, { name: "", affiliation: "" }])
              }
            >
              <Plus />
              Add author
            </Button>
          </div>
          <div className="grid gap-2">
            {authors.map((author, index) => (
              <div key={index} className="flex items-start gap-2">
                <Input
                  value={author.name}
                  placeholder="Name"
                  onChange={(event) =>
                    updateAuthor(index, "name", event.target.value)
                  }
                />
                <Input
                  value={author.affiliation ?? ""}
                  placeholder="Affiliation (optional)"
                  onChange={(event) =>
                    updateAuthor(index, "affiliation", event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() =>
                    setAuthors((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={authors.length === 1}
                  aria-label="Remove author"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label>Papers</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setPaperRefs((prev) => [...prev, { title: "", url: "" }])
              }
            >
              <Plus />
              Add paper
            </Button>
          </div>
          <div className="grid gap-2">
            {paperRefs.map((paper, index) => (
              <div key={index} className="flex items-start gap-2">
                <Input
                  value={paper.title}
                  placeholder="Title"
                  onChange={(event) =>
                    updatePaperRef(index, "title", event.target.value)
                  }
                />
                <Input
                  value={paper.url}
                  placeholder="https://..."
                  onChange={(event) =>
                    updatePaperRef(index, "url", event.target.value)
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground"
                  onClick={() =>
                    setPaperRefs((prev) => prev.filter((_, i) => i !== index))
                  }
                  disabled={paperRefs.length === 1}
                  aria-label="Remove paper"
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DialogFooter className="justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
        <DialogClose asChild>
          <Button
            type="button"
            disabled={isSubmitting || !description.trim()}
            onClick={submit}
          >
            {isAlreadyPublished ? "Save changes" : "Publish to library"}
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

export default PublishPromptDialog;
