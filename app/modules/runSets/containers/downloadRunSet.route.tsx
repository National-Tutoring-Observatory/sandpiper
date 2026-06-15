import archiver from "archiver";
import map from "lodash/map";
import { PassThrough, Readable } from "node:stream";
import { redirect } from "react-router";
import trackServerEvent from "~/modules/analytics/helpers/trackServerEvent.server";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import { ProjectService } from "~/modules/projects/project";
import { RunService } from "~/modules/runs/run";
import type { RunSet } from "~/modules/runSets/runSets.types";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import type { StorageAdapter } from "~/modules/storage/storage.types";
import { RunSetService } from "../runSet";
import type { Route } from "./+types/downloadRunSet.route";

function buildExportFilePaths(
  runSet: RunSet,
  outputDirectory: string,
  exportType: string,
  annotationType: string | undefined,
) {
  const files: { path: string; name: string }[] = [];

  if (exportType === "CSV") {
    files.push({
      path: `${outputDirectory}/${runSet.project}-${runSet._id}-meta.csv`,
      name: `${runSet.project}-${runSet._id}-meta.csv`,
    });

    if (annotationType === "PER_UTTERANCE") {
      files.push({
        path: `${outputDirectory}/${runSet.project}-${runSet._id}-utterances.csv`,
        name: `${runSet.project}-${runSet._id}-utterances.csv`,
      });
    } else if (annotationType === "PER_SESSION") {
      files.push({
        path: `${outputDirectory}/${runSet.project}-${runSet._id}-sessions.csv`,
        name: `${runSet.project}-${runSet._id}-sessions.csv`,
      });
    }
  } else {
    files.push({
      path: `${outputDirectory}/${runSet.project}-${runSet._id}-meta.jsonl`,
      name: `${runSet.project}-${runSet._id}-meta.jsonl`,
    });

    files.push({
      path: `${outputDirectory}/${runSet.project}-${runSet._id}-sessions.jsonl`,
      name: `${runSet.project}-${runSet._id}-sessions.jsonl`,
    });
  }

  return files;
}

async function downloadFiles(
  storage: StorageAdapter,
  files: { path: string; name: string }[],
) {
  return Promise.all(
    files.map(async (file) => {
      const localPath = await storage.download({ sourcePath: file.path });
      return { file, localPath };
    }),
  );
}

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

  const runSet = await RunSetService.findOne({
    _id: params.runSetId,
    project: params.projectId,
  });
  if (!runSet) {
    throw new Error("Run set not found.");
  }

  const runs = await RunService.find({
    match: { _id: { $in: runSet.runs || [] } },
  });
  const annotationType = runs[0]?.annotationType;

  const storage = getStorageAdapter();

  const outputDirectory = `storage/${runSet.project}/run-sets/${runSet._id}/exports`;
  const files = buildExportFilePaths(
    runSet,
    outputDirectory,
    exportType,
    annotationType,
  );
  const localPaths = await downloadFiles(storage, files);

  const archive = archiver("zip", {
    zlib: { level: 9 },
  });

  const passthroughStream = new PassThrough();

  archive.pipe(passthroughStream);

  archive.on("error", (err) => {
    console.error("Archiver encountered an error:", err);
  });

  for (const { file, localPath } of localPaths) {
    archive.file(localPath, { name: file.name });
  }

  archive.finalize();

  trackServerEvent({
    name: "results_downloaded",
    userId: user._id,
    params: { source: "run_set", export_type: exportType.toLowerCase() },
  });

  const webStream = Readable.toWeb(passthroughStream);

  const safeRunSetName = runSet.name.replace(/[\r\n"\\]/g, "_");

  return new Response(webStream as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="project-${runSet.project}-run-set-${runSet._id}-${safeRunSetName}-${formatSuffix}.zip"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
