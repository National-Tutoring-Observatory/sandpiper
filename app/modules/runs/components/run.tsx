import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collection as CollectionUI } from "@/components/ui/collection";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PageHeader,
  PageHeaderLeft,
  PageHeaderRight,
} from "@/components/ui/pageHeader";
import { Progress } from "@/components/ui/progress";
import { StatItem } from "@/components/ui/stat-item";
import find from "lodash/find";
import {
  BadgeCheck,
  BadgeX,
  Copy,
  FolderPlus,
  ListPlus,
  MoreHorizontal,
  OctagonX,
  Pencil,
  Stamp,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import annotationTypes from "~/modules/prompts/annotationTypes";
import formatTimeRemaining from "~/modules/runs/helpers/formatTimeRemaining";
import getRunSessionsItemAttributes from "~/modules/runs/helpers/getRunSessionsItemAttributes";
import { getRunModelDisplayName } from "~/modules/runs/helpers/runModel";
import { getRunStatusKey } from "~/modules/runs/helpers/statusMeta";
import type { Run, RunSession } from "~/modules/runs/runs.types";
import type { RunSet } from "~/modules/runSets/runSets.types";
import DownloadDropdown from "./downloadDropdown";
import RunRunSets from "./runRunSets";

export default function RunDetail({
  teamId,
  run,
  isExporting,
  promptInfo,
  runSets,
  runSetsCount,
  runSessionsProgress,
  runSessionsStep,
  breadcrumbs,
  onExportRunButtonClicked,
  onStopRunClicked,
  onReRunClicked,
  onDuplicateRunButtonClicked,
  onEditRunButtonClicked,
  onDeleteRunButtonClicked,
  onAddToExistingRunSetClicked,
  onAddToNewRunSetClicked,
  onUseAsTemplateClicked,
  runSetId,
  sessions,
  sessionsTotalPages,
  sessionsSearchValue,
  sessionsCurrentPage,
  sessionsSortValue,
  sessionsFiltersValues,
  isSessionsSyncing,
  onSessionsSearchValueChanged,
  onSessionsCurrentPageChanged,
  onSessionsSortValueChanged,
  onSessionsFiltersValueChanged,
}: {
  teamId: string;
  run: Run;
  isExporting: boolean;
  promptInfo: { name: string; version: number };
  runSets: RunSet[];
  runSetsCount: number;
  runSessionsProgress: number;
  runSessionsStep: string;
  breadcrumbs: Breadcrumb[];
  onExportRunButtonClicked: ({ exportType }: { exportType: string }) => void;
  onStopRunClicked: () => void;
  onReRunClicked: () => void;
  onDuplicateRunButtonClicked: (run: Run) => void;
  onEditRunButtonClicked: (run: Run) => void;
  onDeleteRunButtonClicked: (run: Run) => void;
  onAddToExistingRunSetClicked: (run: Run) => void;
  onAddToNewRunSetClicked: (run: Run) => void;
  onUseAsTemplateClicked: (run: Run) => void;
  runSetId?: string;
  sessions: RunSession[];
  sessionsTotalPages: number;
  sessionsSearchValue: string;
  sessionsCurrentPage: number;
  sessionsSortValue: string;
  sessionsFiltersValues: Record<string, string | null>;
  isSessionsSyncing: boolean;
  onSessionsSearchValueChanged: (value: string) => void;
  onSessionsCurrentPageChanged: (page: number) => void;
  onSessionsSortValueChanged: (sort: string) => void;
  onSessionsFiltersValueChanged: (value: Record<string, string | null>) => void;
}) {
  const runStatus = getRunStatusKey(run);
  const projectId =
    typeof run.project === "string" ? run.project : run.project._id;
  return (
    <div className="max-w-7xl p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          {run.isComplete && !run.hasErrored && (
            <DownloadDropdown
              isExporting={isExporting}
              onExportButtonClicked={onExportRunButtonClicked}
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="data-[state=open]:bg-muted">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onAddToExistingRunSetClicked(run)}
              >
                <ListPlus className="mr-2 h-4 w-4" />
                Add to Existing Run Set
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddToNewRunSetClicked(run)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                Add to New Run Set
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onUseAsTemplateClicked(run)}>
                <Stamp className="mr-2 h-4 w-4" />
                Use as Run Set Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDuplicateRunButtonClicked(run)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEditRunButtonClicked(run)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDeleteRunButtonClicked(run)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PageHeaderRight>
      </PageHeader>
      <div className="relative mb-8">
        {(runStatus === "QUEUED" || runStatus === "RUNNING") && (
          <div>
            <div className="mb-1 flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={onStopRunClicked}
              >
                <OctagonX className="mr-1 h-4 w-4" />
                Stop
              </Button>
            </div>
            <Progress value={runSessionsProgress} />
            <div className="mt-1 text-right text-xs opacity-40">
              {runStatus === "RUNNING" ? (
                <>
                  Annotating {runSessionsStep}
                  {(() => {
                    const [completed, total] = runSessionsStep
                      .split("/")
                      .map(Number);
                    const estimate = formatTimeRemaining(
                      run.startedAt,
                      completed,
                      total,
                    );
                    return estimate ? ` · ${estimate}` : null;
                  })()}
                </>
              ) : (
                "Starting..."
              )}
            </div>
          </div>
        )}
        {!run.isRunning && run.stoppedAt && (
          <Alert>
            <OctagonX className="h-4 w-4" />
            <AlertTitle>Run stopped</AlertTitle>
            <AlertDescription>
              This run was stopped before all sessions were annotated.
            </AlertDescription>
          </Alert>
        )}
        {runStatus === "FAILED" && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>All sessions failed</AlertTitle>
            <AlertDescription>
              <p>This run failed during annotation.</p>
              <p>
                Annotated data cannot be exported until this run completes
                successfully
                {runSetId
                  ? ", and run set data cannot be exported until all runs have succeeded"
                  : ""}
                .
              </p>
            </AlertDescription>
          </Alert>
        )}
        {runStatus === "PARTIAL_FAILURE" && (
          <Alert>
            <TriangleAlert className="h-4 w-4" />
            <AlertTitle>
              {run.sessions.filter((s) => s.status === "ERRORED").length} of{" "}
              {run.sessions.length} session
              {run.sessions.length === 1 ? "" : "s"} failed
            </AlertTitle>
            <AlertDescription>
              <p>
                This run completed but some sessions failed during annotation.
              </p>
              <p>
                Annotated data cannot be downloaded until all sessions complete
                successfully
                {runSetId
                  ? ", and run set data cannot be downloaded until all runs have succeeded"
                  : ""}
                .
              </p>
            </AlertDescription>
          </Alert>
        )}
      </div>
      <div>
        {run.isHuman ? (
          <div className="grid grid-cols-2 gap-6">
            <StatItem label="Annotation type">
              {find(annotationTypes, { value: run.annotationType })?.name}
            </StatItem>
            <StatItem label="Annotator">
              {run.annotator?.name || "Unknown"}
            </StatItem>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            <StatItem label="Annotation type">
              {find(annotationTypes, { value: run.annotationType })?.name}
            </StatItem>
            <StatItem label="Selected prompt">
              <div>{promptInfo.name}</div>
              <div>
                <Badge>Version {promptInfo.version}</Badge>
              </div>
            </StatItem>
            <StatItem label="Selected model">
              {getRunModelDisplayName(run)}
            </StatItem>
            <StatItem label="Verification">
              {run.shouldRunVerification ? (
                <Badge variant="outline" className="mt-1 gap-1.5">
                  <BadgeCheck className="text-sandpiper-success h-4 w-4" />
                  Enabled
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1 gap-1.5">
                  <BadgeX className="text-muted-foreground h-4 w-4" />
                  Disabled
                </Badge>
              )}
            </StatItem>
          </div>
        )}
        <div className="mt-6">
          <RunRunSets
            teamId={teamId}
            projectId={projectId}
            runId={run._id}
            runSets={runSets}
            runSetsCount={runSetsCount}
          />
        </div>
        <div className="mt-8">
          <div className="flex items-end justify-between">
            <div className="text-muted-foreground text-xs">Sessions</div>
            {(run.hasErrored || run.stoppedAt) && !run.isRunning && (
              <Button onClick={onReRunClicked}>Re-run</Button>
            )}
          </div>
          <div className="mt-2">
            <CollectionUI
              items={sessions}
              itemsLayout="list"
              getItemAttributes={(item) =>
                getRunSessionsItemAttributes(item, {
                  teamId,
                  projectId,
                  runId: run._id,
                  runSetId,
                })
              }
              getItemActions={() => []}
              onActionClicked={() => {}}
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
                { text: "Status", value: "status" },
              ]}
              onSortValueChanged={onSessionsSortValueChanged}
              isSyncing={isSessionsSyncing}
              filters={[
                {
                  category: "status",
                  text: "Status",
                  options: [
                    { value: "DONE", text: "Complete" },
                    { value: "RUNNING", text: "Running" },
                    { value: "ERRORED", text: "Failed" },
                    { value: "STOPPED", text: "Stopped" },
                    { value: "NOT_STARTED", text: "Queued" },
                  ],
                },
              ]}
              filtersValues={sessionsFiltersValues}
              onFiltersValueChanged={onSessionsFiltersValueChanged}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
