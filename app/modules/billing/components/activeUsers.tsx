import { Collection } from "@/components/ui/collection";
import type { FiltersValues } from "@/components/ui/filters";
import { Download } from "lucide-react";
import triggerDownload from "~/modules/app/helpers/triggerDownload";
import getActiveUserItemAttributes from "../helpers/getActiveUserItemAttributes";
import type { ActiveTeamRow } from "../services/getActiveTeams.server";

interface ActiveUsersTableProps {
  rows: ActiveTeamRow[];
  totalPages: number;
  currentPage: number;
  sortValue: string;
  filtersValues: FiltersValues;
  isSyncing?: boolean;
  onPaginationChanged: (page: number) => void;
  onSortValueChanged: (sort: string) => void;
  onFiltersValueChanged: (filters: FiltersValues) => void;
}

export default function ActiveUsersTable({
  rows,
  totalPages,
  currentPage,
  sortValue,
  filtersValues,
  isSyncing,
  onPaginationChanged,
  onSortValueChanged,
  onFiltersValueChanged,
}: ActiveUsersTableProps) {
  return (
    <div>
      <Collection
        items={rows}
        itemsLayout="list"
        actions={[
          {
            text: "Export CSV",
            icon: <Download className="h-4 w-4" />,
            action: "EXPORT_CSV",
          },
        ]}
        hasPagination
        currentPage={currentPage}
        totalPages={totalPages}
        sortValue={sortValue}
        sortOptions={[{ text: "Total Spend", value: "totalBilledCosts" }]}
        filters={[
          {
            category: "minSpend",
            text: "Minimum Spend",
            options: [
              { value: "0", text: "All" },
              { value: "5", text: "Over $5" },
              { value: "10", text: "Over $10" },
            ],
          },
        ]}
        filtersValues={filtersValues ?? {}}
        isSyncing={isSyncing}
        emptyAttributes={{
          title: "No active teams",
          description: "No teams match the current filter",
        }}
        getItemAttributes={getActiveUserItemAttributes}
        getItemActions={() => []}
        onActionClicked={(action) => {
          if (action === "EXPORT_CSV") {
            const params = new URLSearchParams(window.location.search);
            params.delete("currentPage");
            triggerDownload(`/api/exportActiveUsers?${params.toString()}`);
          }
        }}
        onItemActionClicked={() => {}}
        onPaginationChanged={onPaginationChanged}
        onSortValueChanged={onSortValueChanged}
        onFiltersValueChanged={onFiltersValueChanged}
      />
    </div>
  );
}
