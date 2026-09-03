import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import getTagsEmptyAttributes from "../helpers/getTagsEmptyAttributes";
import getTagsItemActions from "../helpers/getTagsItemActions";
import getTagsItemAttributes from "../helpers/getTagsItemAttributes";
import tagsActions from "../helpers/tagsActions";
import tagsSortOptions from "../helpers/tagsSortOptions";
import type { TagsProps } from "../tags.types";

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
}: TagsProps) => {
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
        getItemActions={getTagsItemActions}
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
