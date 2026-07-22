import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import getKappaCellClass from "../helpers/getKappaCellClass";
import getKappaInterpretation from "../helpers/getKappaInterpretation";
import type { PairDetail } from "../helpers/getPairDetails";

export default function EvaluationPairDetailsItem({
  pair,
}: {
  pair: PairDetail;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-body font-medium">
            {pair.runAName} vs {pair.runBName}
          </div>
          <div className="text-muted-foreground text-caption">
            {pair.sampleSize} samples
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{`κ = ${pair.kappa.toFixed(2)}`}</Badge>
          <Badge variant="outline" className={getKappaCellClass(pair.kappa)}>
            {getKappaInterpretation(pair.kappa)}
          </Badge>
        </div>
      </CardContent>
      {pair.precision != null && pair.recall != null && pair.f1 != null && (
        <CardContent className="border-t pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-muted-foreground text-caption">
                Precision
              </div>
              <div className="text-body font-semibold">
                {pair.precision.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-caption">Recall</div>
              <div className="text-body font-semibold">
                {pair.recall.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-caption">F1</div>
              <div className="text-body font-semibold">
                {pair.f1.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
