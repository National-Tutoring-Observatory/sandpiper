import { Collection as CollectionComponent } from "@/components/ui/collection";
import getRunSetsEmptyAttributes from "~/modules/runSets/helpers/getRunSetsEmptyAttributes";
import getRunSetsItemActions from "~/modules/runSets/helpers/getRunSetsItemActions";
import getRunSetsItemAttributes from "~/modules/runSets/helpers/getRunSetsItemAttributes";
import runSetsActions from "~/modules/runSets/helpers/runSetsActions";
import runSetsSortOptions from "~/modules/runSets/helpers/runSetsSortOptions";
import type { RunSet } from "~/modules/runSets/runSets.types";

interface RunSetsListProps {
  teamId: string;
  runSets: RunSet[];
  totalPages: number;
  searchValue: string;
  currentPage: number;
  sortValue: string;
  isSyncing: boolean;
  onCreateRunSetButtonClicked: () => void;
  onEditRunSetButtonClicked: (runSet: RunSet) => void;
  onDuplicateRunSetButtonClicked: (runSet: RunSet) => void;
  onUseAsTemplateButtonClicked: (runSet: RunSet) => void;
  onDeleteRunSetButtonClicked: (runSet: RunSet) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onSortValueChanged: (sortValue: string) => void;
}

export default function RunSetsList({
  teamId,
  runSets,
  totalPages,
  searchValue,
  currentPage,
  sortValue,
  isSyncing,
  onCreateRunSetButtonClicked,
  onEditRunSetButtonClicked,
  onDuplicateRunSetButtonClicked,
  onUseAsTemplateButtonClicked,
  onDeleteRunSetButtonClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onSortValueChanged,
}: RunSetsListProps) {
  const handleItemActionClicked = ({
    id,
    action,
  }: {
    id: string;
    action: string;
  }) => {
    const runSet = runSets?.find((c) => c._id === id);
    if (!runSet) return;

    switch (action) {
      case "EDIT":
        onEditRunSetButtonClicked(runSet);
        break;
      case "DUPLICATE":
        onDuplicateRunSetButtonClicked(runSet);
        break;
      case "USE_AS_TEMPLATE":
        onUseAsTemplateButtonClicked(runSet);
        break;
      case "DELETE":
        onDeleteRunSetButtonClicked(runSet);
        break;
    }
  };

  const handleActionClicked = (action: string) => {
    if (action === "CREATE") {
      onCreateRunSetButtonClicked();
    }
  };

  return (
    <div className="mt-8">
      <CollectionComponent
        items={runSets || []}
        itemsLayout="list"
        actions={runSetsActions}
        sortOptions={runSetsSortOptions}
        filters={[]}
        filtersValues={{}}
        hasSearch
        hasPagination
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getRunSetsEmptyAttributes()}
        getItemAttributes={(item) => getRunSetsItemAttributes(item, teamId)}
        getItemActions={getRunSetsItemActions}
        onActionClicked={handleActionClicked}
        onItemActionClicked={handleItemActionClicked}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={() => {}}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
