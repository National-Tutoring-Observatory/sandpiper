import { Play } from "lucide-react";
import getDateString from "~/modules/app/helpers/getDateString";
import type { Evaluation } from "~/modules/evaluations/evaluations.types";
import { projectEvaluationUrl } from "~/modules/projects/helpers/projectUrls";

export default function getEvaluationsItemAttributes(
  item: Evaluation,
  teamId: string,
) {
  const runCount = item.runs?.length || 0;

  return {
    id: item._id,
    title: item.name,
    to: projectEvaluationUrl(teamId, item.project, item.runSet, item._id),
    meta: [
      {
        icon: <Play />,
        text: `${runCount} run${runCount !== 1 ? "s" : ""}`,
      },
      {
        text: `Created ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
