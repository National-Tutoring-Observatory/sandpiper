import { Collection } from "@/components/ui/collection";
import { PageHeader, PageHeaderLeft } from "@/components/ui/pageHeader";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import type { User } from "~/modules/users/users.types";
import getTeamsEmptyAttributes from "../helpers/getTeamsEmptyAttributes";
import getTeamsItemAttributes from "../helpers/getTeamsItemAttributes";
import teamsFilters from "../helpers/teamsFilters";
import teamsSortOptions from "../helpers/teamsSortOptions";
import type { Team } from "../teams.types";

interface TeamsProps {
  teams: Team[];
  user: User;
  balances: Record<string, number>;
  breadcrumbs: Breadcrumb[];
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: Record<string, string | null>;
  sortValue: string;
  isSyncing: boolean;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onFiltersValueChanged: (filterValue: Record<string, string | null>) => void;
  onSortValueChanged: (sortValue: string) => void;
}

export default function Teams({
  teams,
  balances,
  breadcrumbs,
  filtersValues,
  sortValue,
  searchValue,
  currentPage,
  totalPages,
  isSyncing,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: TeamsProps) {
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
      </PageHeader>
      <Collection
        items={teams}
        itemsLayout="list"
        filters={teamsFilters}
        sortOptions={teamsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        emptyAttributes={getTeamsEmptyAttributes()}
        isSyncing={isSyncing}
        getItemAttributes={(item) =>
          getTeamsItemAttributes(item, balances[item._id])
        }
        getItemActions={() => []}
        onActionClicked={() => {}}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onFiltersValueChanged={onFiltersValueChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
