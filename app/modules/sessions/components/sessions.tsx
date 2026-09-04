import { Collection } from "@/components/ui/collection";
import type { Project } from "~/modules/projects/projects.types";
import type { Session } from "~/modules/sessions/sessions.types";
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
  searchValue,
  currentPage,
  totalPages,
  filtersValues,
  sortValue,
  isSyncing,
  onActionClicked,
  onSelectChanged,
  onItemClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: {
  project: Project;
  sessions: Session[];
  selectedItems: string[];
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onSelectChanged: (selectedItems: string[]) => void;
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
          { action: "MARK_WITH_TAG", component: <div>Marking...</div> },
        ]}
        selectedItems={selectedItems}
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
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
