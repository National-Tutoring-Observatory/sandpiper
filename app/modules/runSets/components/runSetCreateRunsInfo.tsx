import { StatItem } from "@/components/ui/stat-item";
import type { RunSet } from "../runSets.types";

interface RunSetCreateRunsInfoProps {
  runSet: RunSet;
}

export default function RunSetCreateRunsInfo({
  runSet,
}: RunSetCreateRunsInfoProps) {
  return (
    <div className="bg-muted rounded-lg border p-4">
      <h3 className="text-heading mb-4 font-semibold">RunSet Info</h3>
      <div className="grid grid-cols-2 gap-4">
        <StatItem label="Name">{runSet.name}</StatItem>
        <StatItem label="Annotation Type">
          {runSet.annotationType === "PER_UTTERANCE"
            ? "Per Utterance"
            : "Per Session"}
        </StatItem>
        <StatItem label="Sessions">{runSet.sessions?.length || 0}</StatItem>
        <StatItem label="Existing Runs">{runSet.runs?.length || 0}</StatItem>
      </div>
    </div>
  );
}
