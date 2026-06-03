import get from "lodash/get";
import { BadgeCheck } from "lucide-react";
import getReferenceId from "~/helpers/getReferenceId";
import { getAnnotationLabel } from "~/modules/annotations/helpers/annotationTypes";
import getDateString from "~/modules/app/helpers/getDateString";
import {
  projectRunSetRunUrl,
  projectRunUrl,
} from "~/modules/projects/helpers/projectUrls";
import { getRunModelDisplayName } from "~/modules/runs/helpers/runModel";
import {
  STATUS_META,
  getRunStatusKey,
} from "~/modules/runs/helpers/statusMeta";
import type { Run } from "~/modules/runs/runs.types";

interface Options {
  teamId: string;
  runSetId?: string;
}

export default function getRunsItemAttributes(item: Run, options: Options) {
  const promptName = get(item, "snapshot.prompt.name", "");

  const statusKey = getRunStatusKey(item);
  let statusMeta = STATUS_META[statusKey];

  if (statusKey === "PARTIAL_FAILURE") {
    const failedCount = item.sessions.filter(
      (s) => s.status === "ERRORED",
    ).length;
    statusMeta = {
      ...statusMeta,
      text: `${failedCount} session${failedCount === 1 ? "" : "s"} failed`,
    };
  }

  const meta = [
    statusMeta,
    {
      text: `Annotation type - ${getAnnotationLabel(item.annotationType)}`,
    },
  ];

  if (item.isHuman) {
    meta.push({
      text: `Annotator - ${item.annotator?.name || "Unknown"}`,
    });
  } else if (item.isComplete) {
    const modelName = getRunModelDisplayName(item);
    meta.push({
      text: `Prompt - ${promptName}`,
    });
    meta.push({
      text: `Model - ${modelName}`,
    });
  }

  if (item.shouldRunVerification) {
    meta.push({
      icon: <BadgeCheck className="text-sandpiper-success" />,
      text: "Verified",
    });
  }

  meta.push({
    text: `Created at - ${getDateString(item.createdAt)}`,
  });

  const projectId = getReferenceId(item.project);
  const to = options.runSetId
    ? projectRunSetRunUrl(options.teamId, projectId, options.runSetId, item._id)
    : projectRunUrl(options.teamId, projectId, item._id);

  return {
    id: item._id,
    title: item.name,
    to,
    meta: meta,
  };
}
