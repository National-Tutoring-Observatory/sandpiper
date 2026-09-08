import { Collection } from "@/components/ui/collection";
import type { FiltersValues } from "@/components/ui/filters";
import type { User } from "~/modules/users/users.types";
import getTeamUsersActions from "../helpers/getTeamUsersActions";
import getTeamUsersEmptyAttributes from "../helpers/getTeamUsersEmptyAttributes";
import getTeamUsersItemActions from "../helpers/getTeamUsersItemActions";
import getTeamUsersItemAttributes from "../helpers/getTeamUsersItemAttributes";
import teamUsersFilters from "../helpers/teamUsersFilters";
import teamUsersSortOptions from "../helpers/teamUsersSortOptions";
import type { Team } from "../teams.types";

interface TeamUsersProps {
  users: User[];
  team: Team;
  user: User;
  searchValue: string;
  currentPage: number;
  totalPages: number;
  filtersValues: FiltersValues;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onItemActionClicked: ({ id, action }: { id: string; action: string }) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onFiltersValueChanged: (filterValue: FiltersValues) => void;
  onSortValueChanged: (sortValue: string) => void;
}

export default function TeamUsers({
  users,
  team,
  user,
  filtersValues,
  sortValue,
  searchValue,
  currentPage,
  totalPages,
  isSyncing,
  onActionClicked,
  onItemActionClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onFiltersValueChanged,
  onSortValueChanged,
}: TeamUsersProps) {
  return (
    <div>
      <Collection
        items={users}
        itemsLayout="list"
        actions={getTeamUsersActions(user, team._id)}
        filters={teamUsersFilters}
        sortOptions={teamUsersSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        emptyAttributes={getTeamUsersEmptyAttributes()}
        isSyncing={isSyncing}
        getItemAttributes={(item) => getTeamUsersItemAttributes(item, team)}
        getItemActions={(item) => getTeamUsersItemActions(item, user, team._id)}
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
