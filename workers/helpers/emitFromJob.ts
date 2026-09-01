import type { Job } from "bullmq";
import getSockets from "./getSockets";

export default async (
  job: Job,
  data: Record<string, unknown>,
  status: "STARTED" | "FINISHED" | "UPDATED" | "ERRORED",
) => {
  // Not every job drives a UI update, and those enqueue without `props` (e.g.
  // REMOVE_FEATURE_FLAG). Emitting is optional; reading through a missing
  // `props` is what threw a TypeError on every feature-flag deletion.
  const props = job.data?.props;
  if (!props?.event) return;

  const sockets = await getSockets();
  sockets.emit(props.event, {
    ...data,
    task: props.task,
    status,
  });
};
