import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Item, ItemGroup, ItemSeparator } from "@/components/ui/item";
import { FolderOpen, Zap } from "lucide-react";
import { useEffect } from "react";
import { Link, useFetcher } from "react-router";
import getDateString from "~/modules/app/helpers/getDateString";
import {
  projectRunSetUrl,
  projectRunUrl,
} from "~/modules/projects/helpers/projectUrls";
import type { RunSet } from "~/modules/runSets/runSets.types";

interface RunRunSetsDialogProps {
  teamId: string;
  projectId: string;
  runId: string;
  runSets: RunSet[];
}

export default function RunRunSetsDialog({
  teamId,
  projectId,
  runId,
  runSets,
}: RunRunSetsDialogProps) {
  const fetcher = useFetcher<{ runSets: RunSet[] }>();

  useEffect(() => {
    fetcher.submit(JSON.stringify({ intent: "GET_ALL_RUN_SETS" }), {
      method: "POST",
      encType: "application/json",
      action: projectRunUrl(teamId, projectId, runId),
    });
  }, []);

  const allRunSets = fetcher.data?.runSets || runSets;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Run sets containing this run
        </DialogTitle>
      </DialogHeader>
      <div className="max-h-[400px] overflow-y-auto">
        {fetcher.state === "loading" ? (
          <div className="text-muted-foreground py-8 text-center">
            Loading run sets...
          </div>
        ) : (
          <ItemGroup className="rounded-sm border">
            {allRunSets.map((runSet, index) => {
              const runCount = runSet.runs?.length || 0;
              return (
                <div key={runSet._id}>
                  <Item asChild>
                    <Link to={projectRunSetUrl(teamId, projectId, runSet._id)}>
                      <div className="flex flex-1 flex-col gap-1 py-2">
                        <div className="font-medium">{runSet.name}</div>
                        <div className="text-muted-foreground flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {runCount} run{runCount !== 1 ? "s" : ""}
                          </span>
                          <span>Created {getDateString(runSet.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  </Item>
                  {index !== allRunSets.length - 1 && <ItemSeparator />}
                </div>
              );
            })}
          </ItemGroup>
        )}
      </div>
    </DialogContent>
  );
}
