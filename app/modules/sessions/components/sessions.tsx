import { Collection } from "@/components/ui/collection";
import type { SelectActionChange } from "@/components/ui/selectAll";
import { Tag } from "lucide-react";
import type { Project } from "~/modules/projects/projects.types";
import type { Session } from "~/modules/sessions/sessions.types";
import TagsSelectorContainer from "~/modules/tags/containers/tagsSelector.container";
import getSessionsActions from "../helpers/getSessionsActions";
import getSessionsEmptyAttributes from "../helpers/getSessionsEmptyAttributes";
import getSessionsItemActions from "../helpers/getSessionsItemActions";
import getSessionsItemAttributes from "../helpers/getSessionsItemAttributes";
import sessionsFilters from "../helpers/sessionsFilters";
import sessionsSortOptions from "../helpers/sessionsSortOptions";

export default function Sessions({
  project,
  sessions,
  selectedItems,
  selectActionsValues,
  searchValue,
  currentPage,
  totalPages,
  filtersValues,
  sortValue,
  isSyncing,
  onActionClicked,
  onSelectChanged,
  onSelectActionChanged,
  onItemClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: {
  project: Project;
  sessions: Session[];
  selectedItems: string[];
  selectActionsValues: Record<string, string[]>;
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onSelectChanged: (selectedItems: string[]) => void;
  onSelectActionChanged: (payload: SelectActionChange) => void;
  onItemClicked: (id: string) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onFiltersValueChanged: (filterValue: Record<string, string | null>) => void;
  onSortValueChanged: (sortValue: string) => void;
}) {
  return (
    <div className="mt-8">
      <Collection
        items={sessions}
        itemsLayout="list"
        actions={getSessionsActions(project)}
        selectActions={[
          {
            action: "tag",
            text: "Tag",
            icon: <Tag />,
            component: TagsSelectorContainer,
          },
        ]}
        selectedItems={selectedItems}
        selectActionsValues={selectActionsValues}
        filters={sessionsFilters}
        sortOptions={sessionsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getSessionsEmptyAttributes()}
        getItemAttributes={getSessionsItemAttributes}
        getItemActions={getSessionsItemActions}
        onItemClicked={onItemClicked}
        onActionClicked={onActionClicked}
        onSelectChanged={onSelectChanged}
        onSelectActionChanged={onSelectActionChanged}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
