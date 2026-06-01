import { Collection as CollectionUI } from "@/components/ui/collection";
import { StatItem } from "@/components/ui/stat-item";
import { Play, Trash2 } from "lucide-react";
import getDateString from "~/modules/app/helpers/getDateString";
import type { RunSet } from "~/modules/runSets/runSets.types";
import getRunsItemAttributes from "~/modules/runs/helpers/getRunsItemAttributes";
import runStatusFilters from "~/modules/runs/helpers/runStatusFilters";
import type { Run } from "~/modules/runs/runs.types";
import getSessionsItemAttributes from "~/modules/sessions/helpers/getSessionsItemAttributes";
import type { Session } from "~/modules/sessions/sessions.types";

export default function RunSetOverview({
  runSet,
  runs,
  runsTotalPages,
  runsCurrentPage,
  runsSearchValue,
  runsSortValue,
  isRunsSyncing,
  sessions,
  sessionsTotalPages,
  sessionsCurrentPage,
  sessionsSearchValue,
  sessionsSortValue,
  isSessionsSyncing,
  onSessionItemClicked,
  onRunsSearchValueChanged,
  onRunsCurrentPageChanged,
  runsFiltersValues,
  onRunsFiltersValueChanged,
  onRunsSortValueChanged,
  onSessionsSearchValueChanged,
  onSessionsCurrentPageChanged,
  onSessionsSortValueChanged,
  onCreateRunsClicked,
  onRunActionClicked,
}: {
  runSet: RunSet;
  runs: Run[];
  runsTotalPages: number;
  runsCurrentPage: number;
  runsSearchValue: string;
  runsSortValue: string;
  isRunsSyncing: boolean;
  sessions: Session[];
  sessionsTotalPages: number;
  sessionsCurrentPage: number;
  sessionsSearchValue: string;
  sessionsSortValue: string;
  isSessionsSyncing: boolean;
  onSessionItemClicked: (id: string) => void;
  onRunsSearchValueChanged: (value: string) => void;
  onRunsCurrentPageChanged: (page: number) => void;
  runsFiltersValues: Record<string, string | null>;
  onRunsFiltersValueChanged: (
    filterValue: Record<string, string | null>,
  ) => void;
  onRunsSortValueChanged: (sort: string) => void;
  onSessionsSearchValueChanged: (value: string) => void;
  onSessionsCurrentPageChanged: (page: number) => void;
  onSessionsSortValueChanged: (sort: string) => void;
  onCreateRunsClicked: () => void;
  onRunActionClicked: ({ id, action }: { id: string; action: string }) => void;
}) {
  return (
    <div>
      <div className="grid max-w-7xl grid-cols-3 justify-start gap-6">
        <StatItem label="Created">{getDateString(runSet.createdAt)}</StatItem>
        <StatItem label="Sessions">{runSet.sessions?.length || 0}</StatItem>
        <StatItem label="Runs">{runSet.runs?.length || 0}</StatItem>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="order-2 mt-8 xl:order-1">
          <div className="text-muted-foreground text-xs">Sessions</div>
          <div className="mt-2">
            <CollectionUI
              items={sessions}
              itemsLayout="list"
              getItemAttributes={getSessionsItemAttributes}
              getItemActions={() => []}
              onActionClicked={() => {}}
              onItemClicked={onSessionItemClicked}
              emptyAttributes={{
                title: "No sessions found",
                description: "",
              }}
              hasSearch
              searchValue={sessionsSearchValue}
              onSearchValueChanged={onSessionsSearchValueChanged}
              hasPagination
              currentPage={sessionsCurrentPage}
              totalPages={sessionsTotalPages}
              onPaginationChanged={onSessionsCurrentPageChanged}
              sortValue={sessionsSortValue}
              sortOptions={[
                { text: "Name", value: "name" },
                { text: "Created", value: "createdAt" },
              ]}
              onSortValueChanged={onSessionsSortValueChanged}
              isSyncing={isSessionsSyncing}
              filters={[]}
              filtersValues={{}}
            />
          </div>
        </div>

        <div className="order-1 mt-8 xl:order-2">
          <div className="text-muted-foreground text-xs">Runs</div>
          <div className="mt-2">
            <CollectionUI
              items={runs}
              itemsLayout="list"
              actions={[
                {
                  action: "CREATE_RUNS",
                  text: "Create",
                  icon: <Play className="mr-1 h-4 w-4" />,
                },
              ]}
              getItemAttributes={(item) =>
                getRunsItemAttributes(item, {
                  runSetId: runSet._id,
                })
              }
              getItemActions={() => [
                {
                  action: "REMOVE_FROM_RUN_SET",
                  text: "Remove",
                  icon: <Trash2 className="h-4 w-4" />,
                  variant: "destructive",
                },
              ]}
              onActionClicked={(action) => {
                if (action === "CREATE_RUNS") {
                  onCreateRunsClicked();
                }
              }}
              onItemActionClicked={onRunActionClicked}
              emptyAttributes={{
                title: "No runs found",
                description: "",
              }}
              hasSearch
              searchValue={runsSearchValue}
              onSearchValueChanged={onRunsSearchValueChanged}
              hasPagination
              currentPage={runsCurrentPage}
              totalPages={runsTotalPages}
              onPaginationChanged={onRunsCurrentPageChanged}
              sortValue={runsSortValue}
              sortOptions={[
                { text: "Name", value: "name" },
                { text: "Created", value: "createdAt" },
              ]}
              onSortValueChanged={onRunsSortValueChanged}
              isSyncing={isRunsSyncing}
              filters={runStatusFilters}
              filtersValues={runsFiltersValues}
              onFiltersValueChanged={onRunsFiltersValueChanged}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
