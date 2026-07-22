import type { PairDetail } from "../helpers/getPairDetails";
import EvaluationPairDetailsItem from "./evaluationPairDetailsItem";

export default function EvaluationPairDetails({
  pairs,
}: {
  pairs: PairDetail[];
}) {
  if (pairs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-heading font-semibold">Pair Details</h2>
        <p className="text-muted-foreground text-body">
          Agreement metrics for each run pair
        </p>
      </div>
      <div className="space-y-3">
        {pairs.map((pair) => (
          <EvaluationPairDetailsItem
            key={`${pair.runAId}:${pair.runBId}`}
            pair={pair}
          />
        ))}
      </div>
    </div>
  );
}
