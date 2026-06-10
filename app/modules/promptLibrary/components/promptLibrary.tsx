import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type { Prompt } from "~/modules/prompts/prompts.types";
import getPromptLibraryEmptyAttributes from "../helpers/getPromptLibraryEmptyAttributes";
import getPromptLibraryItemActions from "../helpers/getPromptLibraryItemActions";
import getPromptLibraryItemAttributes from "../helpers/getPromptLibraryItemAttributes";
import promptLibraryFilters from "../helpers/promptLibraryFilters";
import promptLibrarySortOptions from "../helpers/promptLibrarySortOptions";

interface PromptLibraryProps {
  prompts: Prompt[];
  breadcrumbs: Breadcrumb[];
  totalPages: number;
  searchValue: string;
  currentPage: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onSearchValueChanged: (value: string) => void;
  onPaginationChanged: (page: number) => void;
  onFiltersValueChanged: (filters: Record<string, string | null>) => void;
  onSortValueChanged: (value: string) => void;
  onItemActionClicked: (args: { id: string; action: string }) => void;
}

export default function PromptLibrary({
  prompts,
  breadcrumbs,
  totalPages,
  searchValue,
  currentPage,
  filtersValues,
  sortValue,
  isSyncing,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
  onItemActionClicked,
}: PromptLibraryProps) {
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <Collection
        items={prompts}
        itemsLayout="list"
        filters={promptLibraryFilters}
        sortOptions={promptLibrarySortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        emptyAttributes={getPromptLibraryEmptyAttributes()}
        getItemAttributes={getPromptLibraryItemAttributes}
        getItemActions={getPromptLibraryItemActions}
        isSyncing={isSyncing}
        onActionClicked={() => {}}
        onItemActionClicked={onItemActionClicked}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
