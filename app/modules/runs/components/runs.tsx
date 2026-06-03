import { Collection } from "@/components/ui/collection";
import type { Run } from "~/modules/runs/runs.types";
import getRunsEmptyAttributes from "../helpers/getRunsEmptyAttributes";
import useRunsItemActions from "../helpers/getRunsItemActions";
import getRunsItemAttributes from "../helpers/getRunsItemAttributes";
import runsActions from "../helpers/runsActions";
import runsFilters from "../helpers/runsFilters";
import runsSortOptions from "../helpers/runsSortOptions";

export default function Runs({
  teamId,
  runs,
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
  teamId: string;
  runs: Run[];
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
}) {
  const getItemActions = useRunsItemActions();

  return (
    <div className="mt-8">
      <Collection
        items={runs}
        itemsLayout="list"
        actions={runsActions}
        filters={runsFilters}
        sortOptions={runsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getRunsEmptyAttributes()}
        getItemAttributes={(item) => getRunsItemAttributes(item, { teamId })}
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
}
