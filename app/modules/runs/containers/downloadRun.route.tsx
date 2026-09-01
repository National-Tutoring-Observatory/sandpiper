import archiver from "archiver";
import map from "lodash/map";
import { PassThrough, Readable } from "node:stream";
import { redirect } from "react-router";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import sanitizeName from "~/modules/app/helpers/sanitizeName";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { ProjectService } from "~/modules/projects/project";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import { RunService } from "../run";
import type { Route } from "./+types/downloadRun.route";

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireAuth({ request });
  const teamIds = map(user.teams, "team");

  const project = await ProjectService.findOne({
    _id: params.projectId,
    team: { $in: teamIds },
  });

  if (!project) {
    return redirect("/");
  }

  const url = new URL(request.url);

  const searchParams = url.searchParams;

  const exportType = searchParams.get("exportType");
  if (exportType !== "CSV" && exportType !== "JSONL") {
    throw new Error("exportType must be CSV or JSONL");
  }

  const formatSuffix = exportType === "CSV" ? "csv" : "jsonl";

  const run = await RunService.findOne({
    _id: params.runId,
    project: params.projectId,
  });
  if (!run) {
    throw new Error("Run not found.");
  }

  const safeProjectName = sanitizeName(project.name);

  const safeRunName = sanitizeName(run.name);

  const filePrefix = `project_${run.project}_${safeProjectName}-run_${run._id}_${safeRunName}`;

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  const outputDirectory = `storage/${run.project}/runs/${run._id}/exports`;

  const filesToArchive = [];

  if (exportType === "CSV") {
    filesToArchive.push({
      path: `${outputDirectory}/${run.project}-${run._id}-meta.csv`,
      name: `${filePrefix}-meta.csv`,
    });
    if (run.annotationType === "PER_UTTERANCE") {
      filesToArchive.push({
        path: `${outputDirectory}/${run.project}-${run._id}-utterances.csv`,
        name: `${filePrefix}-utterances.csv`,
      });
    } else {
      filesToArchive.push({
        path: `${outputDirectory}/${run.project}-${run._id}-sessions.csv`,
        name: `${filePrefix}-sessions.csv`,
      });
    }
  } else {
    filesToArchive.push({
      path: `${outputDirectory}/${run.project}-${run._id}-meta.jsonl`,
      name: `${filePrefix}-meta.jsonl`,
    });
    filesToArchive.push({
      path: `${outputDirectory}/${run.project}-${run._id}-sessions.jsonl`,
      name: `${filePrefix}-sessions.jsonl`,
    });
  }

  const passthroughStream = new PassThrough();

  archive.pipe(passthroughStream);

  archive.on("error", (err) => {
    console.error("Archiver encountered an error:", err);
  });

  const storage = getStorageAdapter();

  const localPaths = await Promise.all(
    filesToArchive.map(async (file) => {
      const localPath = await storage.download({ sourcePath: file.path });
      return { file, localPath };
    }),
  );

  for (const { file, localPath } of localPaths) {
    archive.file(localPath, { name: file.name });
  }

  archive.finalize();

  trackServerEvent({
    name: "results_downloaded",
    userId: user._id,
    params: { source: "run", export_type: exportType.toLowerCase() },
  });

  const webStream = Readable.toWeb(passthroughStream);

  return new Response(webStream as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filePrefix}-${formatSuffix}.zip"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
