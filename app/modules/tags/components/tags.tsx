import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getTagsEmptyAttributes from "../helpers/getTagsEmptyAttributes";
import useTagsItemActions from "../helpers/getTagsItemActions";
import getTagsItemAttributes from "../helpers/getTagsItemAttributes";
import tagsActions from "../helpers/tagsActions";
import tagsSortOptions from "../helpers/tagsSortOptions";
import type { Tag } from "../tags.types";

const Tags = ({
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
  const getItemActions = useTagsItemActions();

  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <Collection
        items={tags}
        itemsLayout="list"
        actions={tagsActions}
        filters={[]}
        sortOptions={tagsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getTagsEmptyAttributes()}
        getItemAttributes={getTagsItemAttributes}
        getItemActions={getItemActions}
        onActionClicked={onActionClicked}
        onItemActionClicked={onItemActionClicked}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
};

export default Tags;
