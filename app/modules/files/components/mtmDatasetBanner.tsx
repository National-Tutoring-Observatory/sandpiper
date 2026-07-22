import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building, Database, LockOpen, MessageCircleMore } from "lucide-react";

export default function MtmDatasetBanner({
  isUploading,
  onUseMtmDatasetClicked,
}: {
  isUploading: boolean;
  onUseMtmDatasetClicked: () => void;
}) {
  return (
    <div className="from-primary/5 to-primary/[0.01] border-primary/20 mt-4 flex items-center gap-4 rounded-lg border bg-gradient-to-br p-4">
      <div className="bg-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
        <Database className="size-5 text-white" />
      </div>
      <div className="flex-1">
        <h5 className="text-heading font-bold">
          Or use the Million Tutor Moves Dataset&nbsp;
          <Badge className="text-[0.6rem]">NEW</Badge>
        </h5>
        <p className="text-muted-foreground text-caption mt-0.5">
          Get started instantly with real tutoring transcripts from the National
          Tutoring Observatory — no upload needed.
        </p>
        <div className="text-primary text-caption mt-1.5 flex gap-3 font-semibold">
          <span className="flex items-center gap-1">
            <MessageCircleMore className="size-3.5" />
            500 sessions
          </span>
          <span className="flex items-center gap-1">
            <Building className="size-3.5" />
            7,000+ utterances
          </span>
          <span className="flex items-center gap-1">
            <LockOpen className="size-3.5" />
            Open access
          </span>
        </div>
      </div>
      <Button size="sm" disabled={isUploading} onClick={onUseMtmDatasetClicked}>
        Use MTM Dataset
      </Button>
    </div>
  );
}
