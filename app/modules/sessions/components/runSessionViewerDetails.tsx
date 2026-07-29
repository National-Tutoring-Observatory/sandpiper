import getDateString from "~/modules/app/helpers/getDateString";
import type { RunSession } from "~/modules/runs/runs.types";

interface RunSessionViewerDetailsProps {
  session: RunSession;
  utteranceCount: number;
  annotatedUtteranceCount: number;
}

export default function RunSessionViewerDetails({
  session,
  utteranceCount: utteranceCount,
  annotatedUtteranceCount: annotatedUtteranceCount,
}: RunSessionViewerDetailsProps) {
  return (
    <div className="mb-2">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground text-body">Started</span>
        <span className="text-body text-right">
          {getDateString(session.startedAt)}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="text-muted-foreground text-body">Finished</span>
        <span className="text-body text-right">
          {getDateString(session.finishedAt)}
        </span>
      </div>
      {annotatedUtteranceCount > 0 && (
        <div className="mt-2 mb-2">
          <div className="text-muted-foreground text-body mb-2 font-medium">
            Summary
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card flex flex-col items-center rounded-lg border p-2">
              <div className="text-muted-foreground text-caption mb-1">
                Total utterances
              </div>
              <div className="text-heading font-bold">{utteranceCount}</div>
            </div>
            <div className="bg-card flex flex-col items-center rounded-lg border p-2">
              <div className="text-muted-foreground text-caption mb-1">
                Annotated
              </div>
              <div className="text-heading font-bold">
                {annotatedUtteranceCount}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
