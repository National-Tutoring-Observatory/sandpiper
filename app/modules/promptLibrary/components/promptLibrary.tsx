import type { Prompt } from "~/modules/prompts/prompts.types";

interface PromptLibraryProps {
  prompts: Prompt[];
  totalPages: number;
  searchValue: string;
  currentPage: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  isCopying: boolean;
  onSearchValueChanged: (value: string) => void;
  onPaginationChanged: (page: number) => void;
  onFiltersValueChanged: (filters: Record<string, string | null>) => void;
  onSortValueChanged: (value: string) => void;
  onCopyPromptClicked: (promptId: string) => void;
  onOpenPromptClicked: (promptId: string) => void;
}

export default function PromptLibrary({
  prompts,
  onCopyPromptClicked,
  onOpenPromptClicked,
  isCopying,
}: PromptLibraryProps) {
  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-4 text-2xl font-bold">Prompt Library</h1>
      {prompts.length === 0 ? (
        <p className="text-muted-foreground">No published prompts yet.</p>
      ) : (
        <ul className="space-y-2">
          {prompts.map((p) => (
            <li
              key={p._id}
              className="flex items-center justify-between rounded border p-4"
            >
              <button
                type="button"
                className="text-left"
                onClick={() => onOpenPromptClicked(p._id)}
              >
                <div className="font-medium">{p.name}</div>
                {p.library?.description ? (
                  <div className="text-muted-foreground text-sm">
                    {p.library.description}
                  </div>
                ) : null}
              </button>
              <button
                type="button"
                className="rounded border px-3 py-1 text-sm"
                onClick={() => onCopyPromptClicked(p._id)}
                disabled={isCopying}
              >
                Copy to my team
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
