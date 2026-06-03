import { Collection } from "@/components/ui/collection";
import { useContext } from "react";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import type { Prompt } from "~/modules/prompts/prompts.types";
import type { User } from "~/modules/users/users.types";
import getTeamPromptsActions from "../helpers/getTeamPromptsActions";
import getTeamPromptsEmptyAttributes from "../helpers/getTeamPromptsEmptyAttributes";
import getTeamPromptsItemActions from "../helpers/getTeamPromptsItemActions";
import getTeamPromptsItemAttributes from "../helpers/getTeamPromptsItemAttributes";
import teamPromptsFilters from "../helpers/teamPromptsFilters";
import teamPromptsSortOptions from "../helpers/teamPromptsSortOptions";
import type { Team } from "../teams.types";

interface TeamPromptsProps {
  prompts: Prompt[];
  team: Team;
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

export default function TeamPrompts({
  prompts,
  team,
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
}: TeamPromptsProps) {
  const user = useContext(AuthenticationContext) as User | null;

  return (
    <div>
      <Collection
        items={prompts}
        itemsLayout="list"
        actions={getTeamPromptsActions(team._id, user)}
        filters={teamPromptsFilters}
        sortOptions={teamPromptsSortOptions}
        hasSearch
        hasPagination
        filtersValues={filtersValues}
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        emptyAttributes={getTeamPromptsEmptyAttributes()}
        getItemAttributes={(item) => getTeamPromptsItemAttributes(item, user)}
        getItemActions={(item) => getTeamPromptsItemActions(item, user)}
        isSyncing={isSyncing}
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
