import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Download,
  FileInput,
  GitMerge,
  MoreHorizontal,
  OctagonX,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Outlet } from "react-router";
import type { Breadcrumb } from "~/modules/app/app.types";
import Breadcrumbs from "~/modules/app/components/breadcrumbs";
import DownloadDropdown from "~/modules/runs/components/downloadDropdown";
import formatTimeRemaining from "~/modules/runs/helpers/formatTimeRemaining";
import type { RunSet } from "~/modules/runSets/runSets.types";

export default function RunSetDetail({
  runSet,
  isExporting,
  project,
  breadcrumbs,
  annotationProgress,
  onStopAllRunsClicked,
  onExportRunSetButtonClicked,
  onAddRunsClicked,
  onUploadHumanAnnotationsClicked,
  onDownloadAnnotationTemplateClicked,
  onMergeClicked,
  onDuplicateClicked,
  onUseAsTemplateClicked,
  onEditClicked,
  onDeleteClicked,
  activeView,
  onActiveViewChange,
}: {
  runSet: RunSet;
  isExporting: boolean;
  project: { _id: string; name: string };
  breadcrumbs: Breadcrumb[];
  annotationProgress: {
    totalRuns: number;
    completedRuns: number;
    erroredRuns: number;
    totalSessions: number;
    completedSessions: number;
    processing: number;
    startedAt: string | null;
  };
  onStopAllRunsClicked: () => void;
  onExportRunSetButtonClicked: ({ exportType }: { exportType: string }) => void;
  onAddRunsClicked: () => void;
  onUploadHumanAnnotationsClicked: () => void;
  onDownloadAnnotationTemplateClicked: () => void;
  onMergeClicked: () => void;
  onDuplicateClicked: () => void;
  onUseAsTemplateClicked: () => void;
  onEditClicked: () => void;
  onDeleteClicked: () => void;
  activeView: "overview" | "evaluations";
  onActiveViewChange: (value: string) => void;
}) {
  return (
    <div className="p-8">
      <PageHeader>
        <PageHeaderLeft>
          <Breadcrumbs breadcrumbs={breadcrumbs} />
        </PageHeaderLeft>
        <PageHeaderRight>
          <div className="text-muted-foreground flex gap-1">
            {annotationProgress.totalRuns > 0 &&
              annotationProgress.completedRuns ===
                annotationProgress.totalRuns &&
              annotationProgress.erroredRuns === 0 && (
                <DownloadDropdown
                  isExporting={isExporting}
                  onExportButtonClicked={onExportRunSetButtonClicked}
                />
              )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="data-[state=open]:bg-muted">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onAddRunsClicked}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Runs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDownloadAnnotationTemplateClicked}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Annotation Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUploadHumanAnnotationsClicked}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Human Annotations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMergeClicked}>
                  <GitMerge className="mr-2 h-4 w-4" />
                  Merge
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicateClicked}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onUseAsTemplateClicked}>
                  <FileInput className="mr-2 h-4 w-4" />
                  Use as Template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onEditClicked}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDeleteClicked}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PageHeaderRight>
      </PageHeader>
      {annotationProgress.processing > 0 &&
        annotationProgress.completedSessions <
          annotationProgress.totalSessions && (
          <div className="mb-6">
            <div className="mb-1 flex justify-end">
              <Button
                variant="destructive"
                size="sm"
                onClick={onStopAllRunsClicked}
              >
                <OctagonX className="mr-1 h-4 w-4" />
                Stop all runs
              </Button>
            </div>
            <Progress
              value={
                (annotationProgress.completedSessions /
                  annotationProgress.totalSessions) *
                100
              }
            />
            <div className="mt-1 text-right text-xs opacity-40">
              {annotationProgress.completedSessions === 0 ? (
                "Starting..."
              ) : (
                <>
                  {annotationProgress.completedRuns}/
                  {annotationProgress.totalRuns} runs ·{" "}
                  {annotationProgress.completedSessions}/
                  {annotationProgress.totalSessions} sessions completed
                  {(() => {
                    const estimate = formatTimeRemaining(
                      annotationProgress.startedAt,
                      annotationProgress.completedSessions,
                      annotationProgress.totalSessions,
                    );
                    return estimate ? ` · ${estimate}` : null;
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      {annotationProgress.erroredRuns > 0 && (
        <Alert className="mb-6">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>
            {annotationProgress.erroredRuns} of {annotationProgress.totalRuns}{" "}
            run{annotationProgress.totalRuns === 1 ? "" : "s"} failed
          </AlertTitle>
          <AlertDescription>
            Run set data cannot be exported until all runs have succeeded.
            Re-run the failed runs to continue.
          </AlertDescription>
        </Alert>
      )}
      <Tabs
        value={activeView}
        onValueChange={onActiveViewChange}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
        </TabsList>
      </Tabs>
      <Outlet context={{ runSet, project }} />
    </div>
  );
}
