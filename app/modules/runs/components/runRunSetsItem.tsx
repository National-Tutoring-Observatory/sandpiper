import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Zap } from "lucide-react";
import { Link } from "react-router";
import getDateString from "~/modules/app/helpers/getDateString";
import { projectRunSetUrl } from "~/modules/projects/helpers/projectUrls";
import type { RunSet } from "~/modules/runSets/runSets.types";

interface RunRunSetsItemProps {
  teamId: string;
  projectId: string;
  runSet: RunSet;
}

export default function RunRunSetsItem({
  teamId,
  projectId,
  runSet,
}: RunRunSetsItemProps) {
  const runCount = runSet.runs?.length || 0;

  return (
    <Link to={projectRunSetUrl(teamId, projectId, runSet._id)}>
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Badge
            variant="secondary"
            className="hover:bg-accent max-w-[120px] cursor-pointer"
          >
            <span className="truncate">{runSet.name}</span>
          </Badge>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-auto max-w-xs">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{runSet.name}</p>
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {runCount} run{runCount !== 1 ? "s" : ""}
              </span>
              <span>Created {getDateString(runSet.createdAt)}</span>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    </Link>
  );
}
