import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { VerificationImpactRow } from "../helpers/getVerificationImpactData";

function DeltaCell({ value }: { value: number }) {
  const formatted = value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
  return (
    <TableCell
      className={cn(
        "font-medium",
        value > 0 && "text-green-600 dark:text-green-400",
        value < 0 && "text-red-600 dark:text-red-400",
      )}
    >
      {formatted}
    </TableCell>
  );
}

export default function EvaluationVerificationImpact({
  rows,
  goldLabelRunName,
}: {
  rows: VerificationImpactRow[];
  goldLabelRunName: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-heading font-semibold">Verification Impact</h2>
        <p className="text-muted-foreground text-body">
          How verification changed agreement with {goldLabelRunName}
        </p>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2}>Run</TableHead>
              <TableHead colSpan={3} className="border-l text-center">
                Kappa
              </TableHead>
              <TableHead colSpan={3} className="border-l text-center">
                Precision
              </TableHead>
              <TableHead colSpan={3} className="border-l text-center">
                Recall
              </TableHead>
              <TableHead colSpan={3} className="border-l text-center">
                F1
              </TableHead>
              <TableHead rowSpan={2} className="border-l">
                Samples
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="border-l">Pre</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead className="border-l">Pre</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead className="border-l">Pre</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Delta</TableHead>
              <TableHead className="border-l">Pre</TableHead>
              <TableHead>Post</TableHead>
              <TableHead>Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.runId}>
                <TableCell className="font-medium">{row.runName}</TableCell>
                <TableCell className="border-l">
                  {row.preKappa.toFixed(2)}
                </TableCell>
                <TableCell>{row.postKappa.toFixed(2)}</TableCell>
                <DeltaCell value={row.deltaKappa} />
                <TableCell className="border-l">
                  {row.prePrecision.toFixed(2)}
                </TableCell>
                <TableCell>{row.postPrecision.toFixed(2)}</TableCell>
                <DeltaCell value={row.deltaPrecision} />
                <TableCell className="border-l">
                  {row.preRecall.toFixed(2)}
                </TableCell>
                <TableCell>{row.postRecall.toFixed(2)}</TableCell>
                <DeltaCell value={row.deltaRecall} />
                <TableCell className="border-l">
                  {row.preF1.toFixed(2)}
                </TableCell>
                <TableCell>{row.postF1.toFixed(2)}</TableCell>
                <DeltaCell value={row.deltaF1} />
                <TableCell className="border-l">{row.sampleSize}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
