import { Collection } from "@/components/ui/collection";
import type { Project } from "~/modules/projects/projects.types";
import type { User } from "~/modules/users/users.types";
import getTeamProjectsActions from "../helpers/getTeamProjectsActions";
import getTeamProjectsEmptyAttributes from "../helpers/getTeamProjectsEmptyAttributes";
import getTeamProjectsItemActions from "../helpers/getTeamProjectsItemActions";
import getTeamProjectsItemAttributes from "../helpers/getTeamProjectsItemAttributes";
import teamProjectsFilters from "../helpers/teamProjectsFilters";
import teamProjectsSortOptions from "../helpers/teamProjectsSortOptions";
import type { Team } from "../teams.types";

interface TeamProjectsProps {
  projects: Project[];
  team: Team;
  user: User;
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
}

export default function TeamProjects({
  projects,
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
}: TeamProjectsProps) {
  return (
    <div>
      <Collection
        items={projects}
        itemsLayout="list"
        actions={getTeamProjectsActions(user, team._id)}
        filters={teamProjectsFilters}
        sortOptions={teamProjectsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getTeamProjectsEmptyAttributes()}
        getItemAttributes={(item) =>
          getTeamProjectsItemAttributes(item, team._id, user)
        }
        getItemActions={(item) => getTeamProjectsItemActions(item, user)}
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
