import { Collection as CollectionUI } from "@/components/ui/collection";
import type { Evaluation } from "~/modules/evaluations/evaluations.types";
import evaluationsSortOptions from "../helpers/evaluationsSortOptions";
import getEvaluationsActions from "../helpers/getEvaluationsActions";
import getEvaluationsEmptyAttributes from "../helpers/getEvaluationsEmptyAttributes";
import getEvaluationsItemAttributes from "../helpers/getEvaluationsItemAttributes";

export default function RunSetEvaluations({
  teamId,
  evaluations,
  totalPages,
  currentPage,
  searchValue,
  sortValue,
  isSyncing,
  isAbleToCreateEvaluation,
  onSearchValueChanged,
  onCurrentPageChanged,
  onSortValueChanged,
  onItemClicked,
  onActionClicked,
}: {
  teamId: string;
  evaluations: Evaluation[];
  totalPages: number;
  currentPage: number;
  searchValue: string;
  sortValue: string;
  isSyncing: boolean;
  isAbleToCreateEvaluation: boolean;
  onSearchValueChanged: (value: string) => void;
  onCurrentPageChanged: (page: number) => void;
  onSortValueChanged: (sort: string) => void;
  onItemClicked: (id: string) => void;
  onActionClicked: (action: string) => void;
}) {
  return (
    <div className="max-w-7xl">
      <CollectionUI
        items={evaluations}
        itemsLayout="list"
        actions={getEvaluationsActions(isAbleToCreateEvaluation)}
        getItemAttributes={(item) => getEvaluationsItemAttributes(item, teamId)}
        getItemActions={() => []}
        onActionClicked={onActionClicked}
        onItemClicked={onItemClicked}
        emptyAttributes={getEvaluationsEmptyAttributes()}
        hasSearch
        searchValue={searchValue}
        onSearchValueChanged={onSearchValueChanged}
        hasPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPaginationChanged={onCurrentPageChanged}
        sortValue={sortValue}
        sortOptions={evaluationsSortOptions}
        onSortValueChanged={onSortValueChanged}
        isSyncing={isSyncing}
        filters={[]}
        filtersValues={{}}
      />
    </div>
  );
}
