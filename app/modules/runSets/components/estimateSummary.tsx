import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, DollarSign, Wallet } from "lucide-react";
import type { EstimationResult } from "~/modules/runSets/runSets.types";
import { formatCost, formatTime } from "../helpers/formatEstimates";

export default function EstimateSummary({
  estimation,
  balance,
}: {
  estimation: EstimationResult;
  balance: number | null;
}) {
  if (estimation.estimatedTimeSeconds === 0) {
    return null;
  }

  const exceedsBalance = balance !== null && estimation.estimatedCost > balance;

  return (
    <div className="flex items-center gap-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-sandpiper-info flex cursor-help items-center gap-1">
            <Clock className="h-4 w-4" />
            <span className="text-body">
              {formatTime(estimation.estimatedTimeSeconds)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            Estimated time range based on recent runs.
            <br />
            Actual time can vary with load.
          </p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="text-sandpiper-info flex cursor-help items-center gap-1">
            <DollarSign className="h-4 w-4" />
            <span className="text-body">
              {formatCost(estimation.estimatedCost)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Estimate based on avg 500 tokens/session</p>
        </TooltipContent>
      </Tooltip>

      {balance !== null && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex cursor-help items-center gap-1 ${exceedsBalance ? "text-sandpiper-warning" : "text-sandpiper-info"}`}
            >
              <Wallet className="h-4 w-4" />
              <span className="text-body whitespace-nowrap">
                ${formatCost(balance)} remaining
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Your team&apos;s remaining credits</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
