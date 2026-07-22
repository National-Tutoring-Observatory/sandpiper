import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import getKappaCellClass from "../helpers/getKappaCellClass";
import getKappaInterpretation from "../helpers/getKappaInterpretation";
import type { TopPerformer } from "../helpers/getTopPerformersVsGoldLabel";
import RunTypeIcon from "./runTypeIcon";

export default function EvaluationTopPerformersItem({
  performer,
}: {
  performer: TopPerformer;
}) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="bg-muted text-body flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold">
            {performer.rank}
          </div>
          <div className="min-w-0 flex-1">
            <CardHeader className="p-0">
              <CardTitle className="text-body flex items-center gap-1.5">
                <RunTypeIcon
                  isHuman={performer.isHuman}
                  isAdjudication={performer.isAdjudication}
                />
                {performer.runName}
              </CardTitle>
            </CardHeader>
            <div className="text-muted-foreground text-caption">
              {performer.sampleSize} samples
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <div className="text-muted-foreground text-caption">
              {`Cohen's Kappa`}
            </div>
            <div className="text-body font-semibold">
              {performer.kappa.toFixed(2)}
            </div>
          </div>
          <Badge
            variant="outline"
            className={getKappaCellClass(performer.kappa)}
          >
            {getKappaInterpretation(performer.kappa)}
          </Badge>
        </div>
        {performer.precision != null &&
          performer.recall != null &&
          performer.f1 != null && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-muted-foreground text-caption">
                  Precision
                </div>
                <div className="text-body font-semibold">
                  {performer.precision.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-caption">Recall</div>
                <div className="text-body font-semibold">
                  {performer.recall.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-caption">F1</div>
                <div className="text-body font-semibold">
                  {performer.f1.toFixed(2)}
                </div>
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
