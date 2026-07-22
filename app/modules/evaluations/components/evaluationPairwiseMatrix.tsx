import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PairwiseMatrix } from "../helpers/buildPairwiseMatrix";
import getKappaCellClass from "../helpers/getKappaCellClass";
import RunTypeIcon from "./runTypeIcon";

export default function EvaluationPairwiseMatrix({
  matrix,
}: {
  matrix: PairwiseMatrix;
}) {
  if (matrix.runs.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-heading font-semibold">
          Pairwise Agreement Matrix
        </h2>
        <p className="text-muted-foreground text-body">
          {`Cohen's Kappa between all run pairs`}
        </p>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-background sticky left-0 z-10 min-w-50 shadow-[inset_-1px_0_0_0_var(--color-border)]" />
              {matrix.runs.map((run) => (
                <TableHead
                  key={run.runId}
                  className="min-w-50 border-r text-center whitespace-normal last:border-r-0"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <RunTypeIcon
                      isHuman={run.isHuman}
                      isAdjudication={run.isAdjudication}
                    />
                    {run.runName}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.runs.map((rowRun, rowIndex) => (
              <TableRow key={rowRun.runId}>
                <TableCell className="bg-background sticky left-0 z-10 min-w-50 font-medium whitespace-normal shadow-[inset_-1px_0_0_0_var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <RunTypeIcon
                      isHuman={rowRun.isHuman}
                      isAdjudication={rowRun.isAdjudication}
                    />
                    {rowRun.runName}
                  </div>
                </TableCell>
                {matrix.cells[rowIndex].map((cell, colIndex) => (
                  <TableCell
                    key={matrix.runs[colIndex].runId}
                    className={cn(
                      "text-center",
                      cell.kappa !== null && getKappaCellClass(cell.kappa),
                    )}
                  >
                    {cell.kappa !== null ? (
                      <span className="text-body font-medium">
                        {cell.kappa.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-body">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
