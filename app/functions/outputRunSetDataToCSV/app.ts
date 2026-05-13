import fse from "fs-extra";
import { json2csv } from "json-2-csv";
import map from "lodash/map.js";
import type { RunSet } from "~/modules/runSets/runSets.types";
import getAnnotationExportFields from "~/modules/runs/helpers/getAnnotationExportFields";
import getAnnotatorName from "~/modules/runs/helpers/getAnnotatorName";
import { getRunModelCode } from "~/modules/runs/helpers/runModel";
import type { Run } from "~/modules/runs/runs.types";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";

export const handler = async (event: {
  body: {
    runSet: RunSet;
    runs: Run[];
    teamId: string;
    inputFolder: string;
    outputFolder: string;
  };
}) => {
  const { body } = event;
  const { runSet, runs, teamId, inputFolder, outputFolder } = body;

  const utterancesOutputFile = `${outputFolder}/${runSet.project}-${runSet._id}-utterances.csv`;
  const sessionsOutputFile = `${outputFolder}/${runSet.project}-${runSet._id}-sessions.csv`;
  const metaOutputFile = `${outputFolder}/${runSet.project}-${runSet._id}-meta.csv`;

  const storage = getStorageAdapter();

  const { annotationType } = runSet;

  const utteranceKeys = [
    "_id",
    "session_id",
    "sequence_id",
    "role",
    "content",
    "start_time",
    "end_time",
  ];
  const annotationColumnKeys = new Set<string>();
  let utterancesArray: Record<string, unknown>[] = [];
  const sessionsArray: Record<string, unknown>[] = [];
  let isBaseRun = true;
  let aiIndex = 0;

  const annotatorNames: string[] = [];

  for (const run of runs) {
    const annotatorName = getAnnotatorName(run, aiIndex);
    if (!run.isHuman) aiIndex++;
    annotatorNames.push(annotatorName);
    const annotationFields = getAnnotationExportFields(run);

    for (const session of run.sessions) {
      const sessionPath = `${inputFolder}/${run._id}/${session.sessionId}/${session.name}`;
      const downloadedPath = await storage.download({
        sourcePath: sessionPath,
      });
      const json = await fse.readJSON(downloadedPath);

      if (isBaseRun) {
        const transcript = map(json.transcript, (utterance) => {
          const { annotations: _annotations, ...rest } = utterance;
          return { ...rest, _sessionRef: session.sessionId };
        });
        utterancesArray = utterancesArray.concat(transcript);

        sessionsArray.push({
          _id: session.sessionId,
          session_id: json.session_id || json.transcript[0]?.session_id,
        });
      }

      if (annotationType === "PER_UTTERANCE") {
        for (const utterance of json.transcript) {
          const annotations = utterance.annotations || [];
          if (annotations.length === 0) continue;

          const baseUtterance = utterancesArray.find(
            (u) =>
              u._id === utterance._id && u._sessionRef === session.sessionId,
          );

          if (baseUtterance) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            annotations.forEach((annotation: any, index: number) => {
              for (const field of annotationFields) {
                const columnKey = `annotator[${annotatorName}][${index}]${field}`;
                baseUtterance[columnKey] = annotation[field] ?? "";
                annotationColumnKeys.add(columnKey);
              }
            });
          }
        }
      }

      if (annotationType === "PER_SESSION") {
        const annotations = json.annotations || [];
        if (annotations.length > 0) {
          const baseSession = sessionsArray.find(
            (s) => s._id === session.sessionId,
          );

          if (baseSession) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            annotations.forEach((annotation: any, index: number) => {
              for (const field of annotationFields) {
                const columnKey = `annotator[${annotatorName}][${index}]${field}`;
                baseSession[columnKey] = annotation[field] ?? "";
                annotationColumnKeys.add(columnKey);
              }
            });
          }
        }
      }
    }

    if (isBaseRun) isBaseRun = false;
  }

  // Export utterances CSV for PER_UTTERANCE
  if (annotationType === "PER_UTTERANCE") {
    const utterancesCsv = json2csv(utterancesArray, {
      keys: [...utteranceKeys, ...annotationColumnKeys],
      emptyFieldValue: "",
    });

    await fse.outputFile(`tmp/${utterancesOutputFile}`, utterancesCsv);
    const utterancesBuffer = await fse.readFile(`tmp/${utterancesOutputFile}`);
    await storage.upload({
      file: {
        buffer: utterancesBuffer,
        size: utterancesBuffer.length,
        type: "text/csv",
      },
      uploadPath: utterancesOutputFile,
    });
  }

  // Export sessions CSV for PER_SESSION
  if (annotationType === "PER_SESSION") {
    const sessionsCsv = json2csv(sessionsArray, {
      keys: ["_id", "session_id", ...annotationColumnKeys],
      emptyFieldValue: "",
    });

    await fse.outputFile(`tmp/${sessionsOutputFile}`, sessionsCsv);
    const sessionsBuffer = await fse.readFile(`tmp/${sessionsOutputFile}`);
    await storage.upload({
      file: {
        buffer: sessionsBuffer,
        size: sessionsBuffer.length,
        type: "text/csv",
      },
      uploadPath: sessionsOutputFile,
    });
  }

  // Export meta CSV
  const metaArray = runs.map((run, index) => ({
    teamId,
    projectId: run.project,
    runId: run._id,
    runName: run.name,
    annotator: annotatorNames[index],
    annotationType: run.annotationType,
    model: getRunModelCode(run),
    promptName: run.snapshot?.prompt?.name ?? "",
    promptVersion: run.snapshot?.prompt?.version ?? run.promptVersion ?? "",
    promptUserPrompt: run.snapshot?.prompt?.userPrompt ?? "",
    promptSystemPrompt: run.snapshot?.prompt?.systemPrompt ?? "",
    promptVerifySystemPrompt: run.snapshot?.prompt?.verifySystemPrompt ?? "",
    promptAdjudicateSystemPrompt:
      run.snapshot?.prompt?.adjudicateSystemPrompt ?? "",
    promptAnnotationType: run.snapshot?.prompt?.annotationType ?? "",
    isHuman: run.isHuman ?? false,
    sessionsCount: run.sessions.length,
    createdAt: run.createdAt ?? "",
    startedAt: run.startedAt ?? "",
    finishedAt: run.finishedAt ?? "",
  }));

  const metaCsv = json2csv(metaArray, {
    keys: [
      "teamId",
      "projectId",
      "runId",
      "runName",
      "annotator",
      "annotationType",
      "model",
      "promptName",
      "promptVersion",
      "promptUserPrompt",
      "promptSystemPrompt",
      "promptVerifySystemPrompt",
      "promptAdjudicateSystemPrompt",
      "promptAnnotationType",
      "isHuman",
      "sessionsCount",
      "createdAt",
      "startedAt",
      "finishedAt",
    ],
    emptyFieldValue: "",
  });

  await fse.outputFile(`tmp/${metaOutputFile}`, metaCsv);
  const metaBuffer = await fse.readFile(`tmp/${metaOutputFile}`);
  await storage.upload({
    file: { buffer: metaBuffer, size: metaBuffer.length, type: "text/csv" },
    uploadPath: metaOutputFile,
  });
};
