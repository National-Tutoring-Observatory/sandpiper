import { Collection } from "@/components/ui/collection";
import { useContext } from "react";
import { AuthenticationContext } from "~/modules/authentication/authentication.context";
import type { Codebook } from "~/modules/codebooks/codebooks.types";
import type { User } from "~/modules/users/users.types";
import getTeamCodebooksActions from "../helpers/getTeamCodebooksActions";
import getTeamCodebooksEmptyAttributes from "../helpers/getTeamCodebooksEmptyAttributes";
import getTeamCodebooksItemActions from "../helpers/getTeamCodebooksItemActions";
import getTeamCodebooksItemAttributes from "../helpers/getTeamCodebooksItemAttributes";
import teamCodebooksSortOptions from "../helpers/teamCodebooksSortOptions";
import type { Team } from "../teams.types";

interface TeamCodebooksProps {
  codebooks: Codebook[];
  team: Team;
  searchValue: string;
  currentPage: number;
  totalPages: number;
  sortValue: string;
  isSyncing: boolean;
  onActionClicked: (action: string) => void;
  onItemActionClicked: ({ id, action }: { id: string; action: string }) => void;
  onSearchValueChanged: (searchValue: string) => void;
  onPaginationChanged: (currentPage: number) => void;
  onSortValueChanged: (sortValue: string) => void;
}

export default function TeamCodebooks({
  codebooks,
  team,
  sortValue,
  searchValue,
  currentPage,
  totalPages,
  isSyncing,
  onActionClicked,
  onItemActionClicked,
  onSearchValueChanged,
  onPaginationChanged,
  onSortValueChanged,
}: TeamCodebooksProps) {
  const user = useContext(AuthenticationContext) as User | null;

  return (
    <div>
      <Collection
        items={codebooks}
        itemsLayout="list"
        actions={getTeamCodebooksActions(team._id, user)}
        filters={[]}
        filtersValues={{}}
        sortOptions={teamCodebooksSortOptions}
        hasSearch
        hasPagination
        sortValue={sortValue}
        searchValue={searchValue}
        currentPage={currentPage}
        totalPages={totalPages}
        isSyncing={isSyncing}
        emptyAttributes={getTeamCodebooksEmptyAttributes()}
        getItemAttributes={(item) => getTeamCodebooksItemAttributes(item, user)}
        getItemActions={(item) => getTeamCodebooksItemActions(item, user)}
        onActionClicked={onActionClicked}
        onItemActionClicked={onItemActionClicked}
        onSearchValueChanged={onSearchValueChanged}
        onPaginationChanged={onPaginationChanged}
        onSortValueChanged={onSortValueChanged}
      />
    </div>
  );
}
