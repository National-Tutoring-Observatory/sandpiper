import { Zap } from "lucide-react";
import getReferenceId from "~/helpers/getReferenceId";
import getDateString from "~/modules/app/helpers/getDateString";
import { projectRunSetUrl } from "~/modules/projects/helpers/projectUrls";
import type { RunSet } from "../runSets.types";

export default function getRunSetsItemAttributes(item: RunSet, teamId: string) {
  const runCount = item.runs?.length || 0;
  const projectId = getReferenceId(item.project);

  return {
    id: item._id,
    title: item.name,
    to: projectRunSetUrl(teamId, projectId, item._id),
    meta: [
      {
        icon: <Zap />,
        text: `${runCount} run${runCount !== 1 ? "s" : ""}`,
      },
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
