import {
  Outlet,
  redirect,
  useFetcher,
  useLoaderData,
  useParams,
} from "react-router";
import usePollingRevalidation from "~/modules/app/hooks/usePollingRevalidation";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import SystemAdminAuthorization from "~/modules/authorization/systemAdminAuthorization";
import QueueControls from "../components/queueControls";
import QueueStateTabs from "../components/queueStateTabs";
import getQueue from "../helpers/getQueue";
import isQueuePro from "../helpers/isQueuePro";
import type { Route } from "./+types/queue.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.Queues.canManage(user)) {
    return redirect("/");
  }

  const queueType = params.type as string;
  const queue = getQueue(queueType);

  const jobCounts = await queue.getJobCounts();
  const isPaused = await queue.isPaused();

  const isPro = isQueuePro(queue);
  let groupsJobsCount: number | null = null;
  if (isPro) {
    groupsJobsCount = await queue.getGroupsJobsCount();
  }

  return {
    queueType,
    jobCounts,
    isPaused,
    isPro,
    groupsJobsCount,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });
  if (!SystemAdminAuthorization.Queues.canManage(user)) {
    throw new Error("Access denied");
  }

  const { intent } = await request.json();
  const { type: queueType } = params;
  const queue = getQueue(queueType as string);

  if (!queue) {
    throw new Error(`Queue ${queueType} not found`);
  }

  switch (intent) {
    case "PAUSE_QUEUE":
      await queue.pause();
      return { success: true, message: `${queueType} queue paused` };

    case "RESUME_QUEUE":
      await queue.resume();
      return { success: true, message: `${queueType} queue resumed` };

    default:
      throw new Error(`Unknown intent: ${intent}`);
  }
}

export default function QueueRoute() {
  const params = useParams();
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const queueType = params.type as string;
  const { secondsRemaining } = usePollingRevalidation();

  const states = [
    { key: "active", label: "Active", count: data.jobCounts.active },
    { key: "waiting", label: "Waiting", count: data.jobCounts.waiting },
    { key: "completed", label: "Completed", count: data.jobCounts.completed },
    { key: "failed", label: "Failed", count: data.jobCounts.failed },
    { key: "delayed", label: "Delayed", count: data.jobCounts.delayed },
    { key: "paused", label: "Paused", count: data.jobCounts.paused },
    {
      key: "waiting-children",
      label: "Waiting Children",
      count: data.jobCounts["waiting-children"],
    },
  ];

  if (data.isPro && data.groupsJobsCount !== null) {
    states.push({
      key: "groups",
      label: "Groups",
      count: data.groupsJobsCount,
    });
  }

  const handlePauseResume = () => {
    const intent = data.isPaused ? "RESUME_QUEUE" : "PAUSE_QUEUE";
    fetcher.submit(
      { intent },
      {
        method: "POST",
        encType: "application/json",
      },
    );
  };

  return (
    <div>
      <div className="mb-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <QueueStateTabs queueType={queueType} states={states} />

          <QueueControls
            onPauseResume={handlePauseResume}
            isPaused={data.isPaused}
          />
        </div>
        <p className="text-muted-foreground/50 text-caption text-right tabular-nums">
          Refreshing in {String(secondsRemaining).padStart(2, "0")}s
        </p>
      </div>
      <Outlet />
    </div>
  );
}
