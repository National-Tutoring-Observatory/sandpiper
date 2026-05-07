import { Collection } from "@/components/ui/collection";
import getUserSpendItemAttributes from "../helpers/getUserSpendItemAttributes";
import type { UserCostRow } from "../services/getUserCosts.server";

interface UserSpendProps {
  rows: UserCostRow[];
  totalPages: number;
  currentPage: number;
  sortValue: string;
  isSyncing?: boolean;
  onPaginationChanged: (page: number) => void;
  onSortValueChanged: (sort: string) => void;
}

export default function UserSpend({
  rows,
  totalPages,
  currentPage,
  sortValue,
  isSyncing,
  onPaginationChanged,
  onSortValueChanged,
}: UserSpendProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-medium">Spend by User</h3>
      <Collection
        items={rows}
        itemsLayout="list"
        hasPagination
        currentPage={currentPage}
        totalPages={totalPages}
        sortValue={sortValue}
        sortOptions={[
          { text: "Total Spend", value: "totalBilledCosts" },
          { text: "Run Costs", value: "runCosts" },
          { text: "Other Costs", value: "nonRunCosts" },
        ]}
        filters={[]}
        filtersValues={{}}
        isSyncing={isSyncing}
        emptyAttributes={{
          title: "No user spend data",
          description:
            "User-level cost tracking will appear here once new costs are incurred",
        }}
        getItemAttributes={getUserSpendItemAttributes}
        getItemActions={() => []}
        onActionClicked={() => {}}
        onItemActionClicked={() => {}}
        onPaginationChanged={onPaginationChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
