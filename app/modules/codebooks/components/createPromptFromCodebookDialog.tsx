import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { annotationTypeOptions } from "~/modules/annotations/helpers/annotationTypes";
import type { CodebookCategory, CodebookVersion } from "../codebooks.types";
import codifyName from "../helpers/codifyName";

export default function CreatePromptFromCodebookDialog({
  codebookVersions,
  productionVersion,
  codebookVersionId,
  annotationType,
  categoryIds,
  categories,
  hasFlattenedCategories,
  flattenedAnnotationField,
  hasAllCategoriesSelected,
  isSubmitDisabled,
  onCodebookVersionChanged,
  onAnnotationTypeChanged,
  onCategoryToggled,
  onToggleAllCategoriesClicked,
  onHasFlattenedCategoriesChanged,
  onFlattenedAnnotationFieldChanged,
  onSubmitClicked,
}: {
  codebookVersions: CodebookVersion[];
  productionVersion: number;
  codebookVersionId: string;
  annotationType: string;
  categoryIds: string[];
  categories: CodebookCategory[];
  hasFlattenedCategories: boolean;
  flattenedAnnotationField: string;
  hasAllCategoriesSelected: boolean;
  isSubmitDisabled: boolean;
  onCodebookVersionChanged: (id: string) => void;
  onAnnotationTypeChanged: (type: string) => void;
  onCategoryToggled: (categoryId: string, checked: boolean) => void;
  onToggleAllCategoriesClicked: () => void;
  onHasFlattenedCategoriesChanged: (value: boolean) => void;
  onFlattenedAnnotationFieldChanged: (value: string) => void;
  onSubmitClicked: () => void;
}) {
  return (
    <DialogContent className="flex max-h-[80vh] flex-col">
      <DialogHeader>
        <DialogTitle>Create prompt from codebook</DialogTitle>
        <DialogDescription>
          Generate a prompt using AI from the selected codebook version. The
          codebook categories and codes will be used to build the annotation
          schema.
        </DialogDescription>
      </DialogHeader>
      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto">
        <Label htmlFor="codebook-version">Codebook version</Label>
        <Select
          value={codebookVersionId}
          onValueChange={onCodebookVersionChanged}
        >
          <SelectTrigger id="codebook-version" className="w-[240px]">
            <SelectValue placeholder="Select a version" />
          </SelectTrigger>
          <SelectContent>
            {codebookVersions.map((v) => (
              <SelectItem key={v._id} value={v._id}>
                {v.name} (v{v.version})
                {v.version === productionVersion ? " - Production" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Label htmlFor="annotation-type">Annotation type</Label>
        <Select value={annotationType} onValueChange={onAnnotationTypeChanged}>
          <SelectTrigger id="annotation-type" className="w-[240px]">
            <SelectValue placeholder="Select an annotation type" />
          </SelectTrigger>
          <SelectContent>
            {annotationTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between gap-2">
          <Label>Categories to include</Label>
          {categories.length > 0 && (
            <Button
              variant="link"
              size="sm"
              className="text-caption p-0"
              onClick={onToggleAllCategoriesClicked}
            >
              {hasAllCategoriesSelected ? "Deselect all" : "Select all"}
            </Button>
          )}
        </div>
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-body">
            This codebook version has no categories.
          </p>
        ) : (
          <ItemGroup className="gap-2">
            {categories.map((category) => {
              const checkboxId = `category-${category._id}`;
              const checked = categoryIds.includes(category._id);
              return (
                <Item
                  key={category._id}
                  variant="outline"
                  size="sm"
                  className="hover:bg-accent cursor-pointer"
                  onClick={() => onCategoryToggled(category._id, !checked)}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={checked}
                    onCheckedChange={(next) =>
                      onCategoryToggled(category._id, next === true)
                    }
                  />
                  <ItemContent>
                    <ItemTitle>{category.name}</ItemTitle>
                    <code className="text-muted-foreground bg-muted inline w-fit rounded px-1 py-0.5 text-[10px]">
                      Code: {codifyName(category.name)}
                    </code>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        )}
        <div className="flex flex-col gap-2">
          <Label>Flatten categories</Label>
          <p className="text-muted-foreground text-body">
            Flattening categories will mean that all the categories will be put
            into the prompt as one annotation field key and not multiple.
          </p>
          <div className="flex items-center gap-3">
            <Switch
              id="has-flattened-categories"
              checked={hasFlattenedCategories}
              onCheckedChange={onHasFlattenedCategoriesChanged}
            />
            <Label htmlFor="has-flattened-categories" className="font-normal">
              Flatten categories
            </Label>
          </div>
          {hasFlattenedCategories && (
            <div className="grid gap-1.5">
              <Label htmlFor="flattened-annotation-field">
                Annotation field
              </Label>
              <Input
                id="flattened-annotation-field"
                autoFocus
                value={flattenedAnnotationField}
                onChange={(e) =>
                  onFlattenedAnnotationFieldChanged(e.target.value)
                }
              />
              <p className="text-muted-foreground text-caption">
                This field will act as the main annotation field for all
                categories.
              </p>
            </div>
          )}
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
            disabled={isSubmitDisabled}
            onClick={onSubmitClicked}
          >
            Create prompt
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
