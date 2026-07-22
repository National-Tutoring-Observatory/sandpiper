import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookCheck, CirclePlus, Save } from "lucide-react";
import { useState } from "react";
import type { CodebookCategory, CodebookVersion } from "../codebooks.types";
import { createEmptyCategory } from "../helpers/codebookEditorHelpers";
import CodebookCategoryEditor from "./codebookCategoryEditor";
import CodebookCategoryItem from "./codebookCategoryItem";

export default function CodebookEditor({
  codebookVersion,
  isLoading,
  isProduction,
  onSaveCodebookVersion,
  onMakeCodebookVersionProduction,
}: {
  codebookVersion: CodebookVersion;
  isLoading: boolean;
  isProduction: boolean;
  onSaveCodebookVersion: ({
    name,
    categories,
  }: {
    name: string;
    categories: CodebookCategory[];
  }) => void;
  onMakeCodebookVersionProduction: () => void;
}) {
  const [hasChanges, setHasChanges] = useState(false);
  const [name, setName] = useState(codebookVersion.name);
  const [categories, setCategories] = useState<CodebookCategory[]>(
    codebookVersion.categories,
  );
  const [activeCategory, setActiveCategory] = useState(
    categories.length > 0 ? categories[0]._id : "",
  );
  const [editingCode, setEditingCode] = useState<string | null>(null);

  const disabled = codebookVersion.hasBeenSaved;

  const selectedCategory = categories.find((c) => c._id === activeCategory);

  const onNameChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHasChanges(true);
    setName(event.target.value);
  };

  const updateCategories = (updated: CodebookCategory[]) => {
    setHasChanges(true);
    setCategories(updated);
  };

  const addCategory = () => {
    const newCategory = createEmptyCategory();
    const updated = [...categories, newCategory];
    updateCategories(updated);
    setActiveCategory(newCategory._id);
  };

  const removeCategory = (categoryId: string) => {
    const updated = categories.filter((c) => c._id !== categoryId);
    updateCategories(updated);
    if (activeCategory === categoryId && updated.length > 0) {
      setActiveCategory(updated[0]._id);
    }
  };

  const updateCategory = (updated: CodebookCategory) => {
    updateCategories(
      categories.map((c) => (c._id === updated._id ? updated : c)),
    );
  };

  const onSaveClicked = () => {
    onSaveCodebookVersion({ name, categories });
  };

  return (
    <div className="border-l">
      <div className="text-body flex items-center justify-between border-b p-2">
        <div>
          <div>{`Version: ${codebookVersion.name}`}</div>
        </div>
        <div className="flex items-center space-x-4">
          {!isProduction && codebookVersion.hasBeenSaved && (
            <Button
              variant="ghost"
              className="hover:text-sandpiper-accent cursor-pointer"
              onClick={onMakeCodebookVersionProduction}
            >
              <BookCheck />
              Make production version
            </Button>
          )}
          {!codebookVersion.hasBeenSaved && (
            <Button
              variant="ghost"
              className="hover:text-sandpiper-accent cursor-pointer"
              disabled={!hasChanges || isLoading}
              onClick={onSaveClicked}
            >
              <Save />
              Save codebook version
            </Button>
          )}
        </div>
      </div>

      <div className="p-8 pb-0">
        <div className="grid gap-3">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={name}
            disabled={disabled}
            autoComplete="off"
            onChange={onNameChanged}
          />
        </div>
      </div>

      <div className="flex p-8 pt-4">
        <div className="w-1/4 rounded-l-md border">
          <div className="text-body flex items-center justify-between border-b p-2">
            <div>Categories</div>
            {!disabled && (
              <Button size="icon" variant="ghost" onClick={addCategory}>
                <CirclePlus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {categories.map((c) => (
            <CodebookCategoryItem
              key={c._id}
              name={c.name}
              isSelected={activeCategory === c._id}
              onClick={() => setActiveCategory(c._id)}
            />
          ))}
        </div>

        <div className="w-3/4 rounded-r-md border-t border-r border-b">
          {selectedCategory ? (
            <CodebookCategoryEditor
              category={selectedCategory}
              disabled={disabled}
              editingCode={editingCode}
              onChange={updateCategory}
              onRemove={() => removeCategory(selectedCategory._id)}
              onEditCode={(codeId) => setEditingCode(codeId)}
              onCloseCodeEditor={() => setEditingCode(null)}
            />
          ) : (
            <p className="text-muted-foreground text-body p-4">
              No categories yet. Add a category to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
