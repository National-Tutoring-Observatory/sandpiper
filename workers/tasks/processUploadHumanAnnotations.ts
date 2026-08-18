import type { Job } from "bullmq";
import { parse } from "csv-parse/sync";
import fse from "fs-extra";
import filter from "lodash/filter";
import find from "lodash/find.js";
import buildAnnotationsForUtterance from "../../app/modules/humanAnnotations/helpers/buildAnnotationsForUtterance";
import { RunService } from "../../app/modules/runs/run";
import getStorageAdapter from "../../app/modules/storage/helpers/getStorageAdapter";
import emitFromJob from "../helpers/emitFromJob";
import updateRunSession from "../helpers/updateRunSession";

export default async function processUploadHumanAnnotations(job: Job) {
  const {
    runId,
    sessionId,
    sessionName,
    annotator,
    headers,
    fieldTypes,
    csvPath,
    inputFile,
    outputFolder,
  } = job.data;

  const run = await RunService.findById(runId);
  if (run?.stoppedAt) {
    return { status: "STOPPED" };
  }

  try {
    await updateRunSession({
      runId,
      sessionId,
      update: { status: "RUNNING", startedAt: new Date() },
    });

    await emitFromJob(job, { runId, sessionId }, "STARTED");

    const storage = getStorageAdapter();

    const jobCsvPath = csvPath.replace(/\.csv$/, `-${job.id}.csv`);
    const csvDownloadPath = await storage.download({
      sourcePath: csvPath,
      destinationPath: jobCsvPath,
    });
    const csvData = await fse.readFile(csvDownloadPath);
    const rows: Record<string, string>[] = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    });

    const sessionNameWithoutExt = sessionName.replace(/\.[^.]+$/, "");
    const sessionRows = rows.filter(
      (row) =>
        row.session_id === sessionName ||
        row.session_id === sessionNameWithoutExt,
    );

    const downloadedPath = await storage.download({ sourcePath: inputFile });
    const fileData = await fse.readFile(downloadedPath);
    const originalJSON = JSON.parse(fileData.toString());

    for (const row of sessionRows) {
      const utterance = find(
        originalJSON.transcript,
        (u: Record<string, unknown>) =>
          String(u.sequence_id) === String(row.sequence_id),
      );
      if (!utterance) continue;

      const annotations = buildAnnotationsForUtterance(
        row,
        utterance._id,
        annotator,
        headers,
        // Jobs already queued when this deployed have no fieldTypes in their data
        fieldTypes ?? {},
      );

      utterance.annotations = [
        ...(utterance.annotations || []),
        ...annotations,
      ];
    }

    const inputFileSplit = inputFile.split("/");
    const outputFileName = inputFileSplit[inputFileSplit.length - 1].replace(
      ".json",
      "",
    );

    await fse.outputJSON(
      `tmp/${outputFolder}/${outputFileName}.json`,
      originalJSON,
    );

    const buffer = await fse.readFile(
      `tmp/${outputFolder}/${outputFileName}.json`,
    );

    await storage.upload({
      file: { buffer, size: buffer.length, type: "application/json" },
      uploadPath: `${outputFolder}/${outputFileName}.json`,
    });

    await fse.remove(`tmp/${outputFolder}/${outputFileName}.json`);
    await fse.remove(csvDownloadPath);
    await fse.remove(downloadedPath);

    await updateRunSession({
      runId,
      sessionId,
      update: { status: "DONE", finishedAt: new Date() },
    });

    const updatedRun = await RunService.findById(runId);
    if (!updatedRun) throw new Error(`Run not found: ${runId}`);

    const completedCount = filter(updatedRun.sessions, {
      status: "DONE",
    }).length;
    const totalCount = updatedRun.sessions.length;

    await emitFromJob(
      job,
      {
        runId,
        sessionId,
        progress: Math.round((100 / totalCount) * completedCount),
        step: `${completedCount}/${totalCount}`,
      },
      "FINISHED",
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await updateRunSession({
      runId,
      sessionId,
      update: {
        error: errorMessage,
        status: "ERRORED",
        finishedAt: new Date(),
      },
    });

    await emitFromJob(job, { runId, sessionId }, "ERRORED");

    return { status: "ERRORED", error: errorMessage };
  }
}
