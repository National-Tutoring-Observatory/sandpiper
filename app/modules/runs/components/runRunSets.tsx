import { Button } from "@/components/ui/button";
import { StatItem } from "@/components/ui/stat-item";
import addDialog from "~/modules/dialogs/addDialog";
import type { RunSet } from "~/modules/runSets/runSets.types";
import RunRunSetsDialog from "./runRunSetsDialog";
import RunRunSetsItem from "./runRunSetsItem";

interface RunRunSetsProps {
  teamId: string;
  projectId: string;
  runId: string;
  runSets: RunSet[];
  runSetsCount: number;
}

export default function RunRunSets({
  teamId,
  projectId,
  runId,
  runSets,
  runSetsCount,
}: RunRunSetsProps) {
  const hasMore = runSetsCount > 3;
  const displayRunSets = runSets.slice(0, 3);
  const remainingCount = runSetsCount - 3;

  const openRunSetsDialog = () => {
    addDialog(
      <RunRunSetsDialog
        teamId={teamId}
        projectId={projectId}
        runId={runId}
        runSets={runSets}
      />,
    );
  };

  if (runSetsCount === 0) {
    return (
      <StatItem label="Run Sets">
        <span className="text-muted-foreground">None</span>
      </StatItem>
    );
  }

  return (
    <StatItem label="Run Sets">
      <div className="flex flex-wrap items-center gap-2">
        {displayRunSets.map((runSet) => (
          <RunRunSetsItem
            key={runSet._id}
            teamId={teamId}
            projectId={projectId}
            runSet={runSet}
          />
        ))}
        {hasMore && (
          <Button
            variant="link"
            size="sm"
            className="ml-2 h-auto px-0 py-0 text-xs"
            onClick={openRunSetsDialog}
          >
            +{remainingCount} more
          </Button>
        )}
      </div>
    </StatItem>
  );
}
