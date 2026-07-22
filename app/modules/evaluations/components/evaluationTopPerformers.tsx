import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { TopPerformer } from "../helpers/getTopPerformersVsGoldLabel";
import EvaluationTopPerformersItem from "./evaluationTopPerformersItem";

const DEFAULT_VISIBLE_COUNT = 3;

export default function EvaluationTopPerformers({
  performers,
  goldLabelRunName,
}: {
  performers: TopPerformer[];
  goldLabelRunName: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (performers.length === 0) {
    return null;
  }

  const hasMore = performers.length > DEFAULT_VISIBLE_COUNT;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-heading font-semibold">
          Top Performers vs Gold Label
        </h2>
        <p className="text-muted-foreground text-body">
          Ranked by agreement with {goldLabelRunName}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {performers.map((performer, index) => {
          if (!isExpanded && index >= DEFAULT_VISIBLE_COUNT) return null;
          return (
            <EvaluationTopPerformersItem
              key={performer.runId}
              performer={performer}
            />
          );
        })}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Show less" : `Show all (${performers.length})`}
        </Button>
      )}
    </div>
  );
}
