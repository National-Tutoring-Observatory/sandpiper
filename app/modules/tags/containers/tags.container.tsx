import type { Breadcrumb } from "~/modules/app/app.types";
import Tags from "../components/tags";
import type { Tag } from "../tags.types";

const TagsContainer = ({
  breadcrumbs,
  tags,
  searchValue,
  currentPage,
  totalPages,
  filtersValues,
  sortValue,
  isSyncing,
  onActionClicked,
  onItemActionClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: {
  breadcrumbs: Breadcrumb[];
  tags: Tag[];
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onItemActionClicked: ({ id, action }: { id: string; action: string }) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onFiltersValueChanged: (filterValue: Record<string, string | null>) => void;
  onSortValueChanged: (sortValue: string) => void;
}) => {
  return (
    <Tags
      breadcrumbs={breadcrumbs}
      tags={tags}
      searchValue={searchValue}
      currentPage={currentPage}
      totalPages={totalPages}
      filtersValues={filtersValues}
      sortValue={sortValue}
      isSyncing={isSyncing}
      onActionClicked={onActionClicked}
      onItemActionClicked={onItemActionClicked}
      onSearchValueChanged={onSearchValueChanged}
      onPaginationChanged={onPaginationChanged}
      onFiltersValueChanged={onFiltersValueChanged}
      onSortValueChanged={onSortValueChanged}
    />
  );
};

export default TagsContainer;
