import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SearchSupportArticlesDialog({
  searchValue,
  onSearchValueChange,
  results,
  onSelectArticle,
}: {
  searchValue: string;
  onSearchValueChange: (val: string) => void;
  results: { documentId: string; title: string; snippet: string }[];
  onSelectArticle: (documentId: string) => void;
}) {
  const MIN_SEARCH_LENGTH = 3;
  const trimmedSearch = searchValue.trim();
  let resultsContent;
  if (results.length > 0) {
    resultsContent = results.map((article) => (
      <div key={article.documentId} className="mb-3">
        <Button
          variant="ghost"
          className="mb-1 w-full text-left"
          onClick={() => onSelectArticle(article.documentId)}
        >
          {article.title}
        </Button>
        <div
          className="text-muted-foreground text-caption px-2 py-1"
          dangerouslySetInnerHTML={{ __html: article.snippet }}
        />
      </div>
    ));
  } else if (
    trimmedSearch.length > 0 &&
    trimmedSearch.length < MIN_SEARCH_LENGTH
  ) {
    resultsContent = (
      <div className="text-muted-foreground px-2 py-2">
        Enter at least {MIN_SEARCH_LENGTH} characters to search.
      </div>
    );
  } else {
    resultsContent = (
      <div className="text-muted-foreground px-2 py-2">No results found.</div>
    );
  }

  return (
    <DialogContent className="flex h-full max-h-[70vh] min-h-[350px] flex-col">
      <DialogHeader>
        <DialogTitle>Search Support Articles</DialogTitle>
        <DialogDescription>Find help articles by keyword.</DialogDescription>
      </DialogHeader>
      <input
        type="text"
        className="mb-4 w-full rounded border px-2 py-1"
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => onSearchValueChange(e.target.value)}
        autoFocus
      />
      <div className="flex-1 overflow-y-auto">{resultsContent}</div>
      <DialogFooter className="mt-4 flex-shrink-0 justify-end">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancel
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
