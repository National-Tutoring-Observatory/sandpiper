import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CirclePlus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import addDialog from "~/modules/dialogs/addDialog";
import type { CodebookCategory, CodebookCode } from "../codebooks.types";
import { createEmptyCode } from "../helpers/codebookEditorHelpers";
import codifyName from "../helpers/codifyName";
import CodebookCodeEditor from "./codebookCodeEditor";
import DeleteCategoryDialog from "./deleteCategoryDialog";
import DeleteCodeDialog from "./deleteCodeDialog";

export default function CodebookCategoryEditor({
  category,
  disabled,
  editingCode,
  onChange,
  onRemove,
  onEditCode,
  onCloseCodeEditor,
}: {
  category: CodebookCategory;
  disabled: boolean;
  editingCode: string | null;
  onChange: (category: CodebookCategory) => void;
  onRemove: () => void;
  onEditCode: (codeId: string) => void;
  onCloseCodeEditor: () => void;
}) {
  const editingCodeData = useMemo(
    () => category.codes.find((c) => c._id === editingCode) || null,
    [category.codes, editingCode],
  );

  const addCode = () => {
    const newCode = createEmptyCode();
    onChange({ ...category, codes: [...category.codes, newCode] });
    onEditCode(newCode._id);
  };

  const removeCode = (codeId: string) => {
    if (editingCode === codeId) {
      onCloseCodeEditor();
    }
    onChange({
      ...category,
      codes: category.codes.filter((c) => c._id !== codeId),
    });
  };

  const openDeleteCodeDialog = (code: CodebookCode) => {
    addDialog(
      <DeleteCodeDialog
        codeName={code.code}
        onDeleteClicked={() => removeCode(code._id)}
      />,
    );
  };

  const updateCode = (updated: CodebookCode) => {
    onChange({
      ...category,
      codes: category.codes.map((c) => (c._id === updated._id ? updated : c)),
    });
  };

  const openDeleteCategoryDialog = () => {
    addDialog(
      <DeleteCategoryDialog
        categoryName={category.name}
        onDeleteClicked={onRemove}
      />,
    );
  };

  return (
    <div className="h-full">
      <div className="text-body flex items-center justify-between border-b p-2">
        <div>{category.name || "Untitled"}</div>
        {!disabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={openDeleteCategoryDialog}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove category</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="grid gap-4 p-4 pb-0">
        <div className="grid gap-3">
          <Label htmlFor={`category-name-${category._id}`}>Category name</Label>
          <Input
            id={`category-name-${category._id}`}
            value={category.name}
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => onChange({ ...category, name: e.target.value })}
          />
          {category.name && (
            <code className="text-muted-foreground bg-muted inline w-fit rounded px-1 py-0.5 text-[10px]">
              Code: {codifyName(category.name)}
            </code>
          )}
        </div>
        <div className="grid gap-3">
          <Label htmlFor={`category-desc-${category._id}`}>Description</Label>
          <Textarea
            id={`category-desc-${category._id}`}
            value={category.description}
            disabled={disabled}
            onChange={(e) =>
              onChange({ ...category, description: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid gap-3 p-4">
        <div className="overflow-hidden rounded-md border">
          <div className="text-body flex items-center justify-between border-b p-2">
            <div>Codes</div>
            {!disabled && (
              <Button size="icon" variant="ghost" onClick={addCode}>
                <CirclePlus className="h-4 w-4" />
              </Button>
            )}
          </div>

          {category.codes.length === 0 ? (
            <p className="text-muted-foreground text-body p-4">
              No codes yet. Add a code to this category.
            </p>
          ) : (
            <div>
              {category.codes.map((code, index) => (
                <Item
                  key={code._id}
                  className={`hover:bg-accent/50 cursor-pointer${index < category.codes.length - 1 ? "border-b" : ""}`}
                  onClick={() => onEditCode(code._id)}
                >
                  <ItemContent className="gap-1">
                    <ItemTitle>{code.code || "Untitled code"}</ItemTitle>
                    <ItemDescription>{code.definition}</ItemDescription>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground w-fit"
                    >
                      {code.examples.length}{" "}
                      {code.examples.length === 1 ? "example" : "examples"}
                    </Badge>
                  </ItemContent>
                  {!disabled && (
                    <ItemActions>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteCodeDialog(code);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ItemActions>
                  )}
                </Item>
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet
        open={!!editingCode}
        onOpenChange={(open) => {
          if (!open) onCloseCodeEditor();
        }}
      >
        <SheetContent side="right" className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit code</SheetTitle>
            <SheetDescription>
              Edit the code details and examples below.
            </SheetDescription>
          </SheetHeader>
          {editingCodeData && (
            <CodebookCodeEditor
              code={editingCodeData}
              disabled={disabled}
              onChange={updateCode}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
