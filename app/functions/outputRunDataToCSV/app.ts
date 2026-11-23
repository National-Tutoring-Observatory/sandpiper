import fse from "fs-extra";
import { json2csv } from "json-2-csv";
import map from "lodash/map.js";
import getAnnotationExportFields from "~/modules/runs/helpers/getAnnotationExportFields";
import getAnnotatorName from "~/modules/runs/helpers/getAnnotatorName";
import { getRunModelCode } from "~/modules/runs/helpers/runModel";
import type { Run } from "~/modules/runs/runs.types";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";

export const handler = async (event: {
  body: { run: Run; teamId: string; inputFolder: string; outputFolder: string };
}) => {
  try {
    const { body } = event;
    const { run, teamId, inputFolder, outputFolder } = body;

    const utterancesOutputFile = `${outputFolder}/${run.project}-${run._id}-utterances.csv`;
    const sessionsOutputFile = `${outputFolder}/${run.project}-${run._id}-sessions.csv`;
    const metaOutputFile = `${outputFolder}/${run.project}-${run._id}-meta.csv`;

    const utteranceKeys = [
      "_id",
      "session_id",
      "sequence_id",
      "role",
      "content",
      "start_time",
      "end_time",
      "timestamp",
    ];
    const annotationColumnKeys = new Set<string>();
    let utterancesArray: Record<string, unknown>[] = [];
    const sessionsArray: Record<string, unknown>[] = [];

    const storage = getStorageAdapter();

    const annotatorName = getAnnotatorName(run);
    const annotationFields = getAnnotationExportFields(run);

    for (const session of run.sessions) {
      const sessionPath = `${inputFolder}/${session.sessionId}/${session.name}`;

      const downloadedPath = await storage.download({
        sourcePath: sessionPath,
      });
      const json = await fse.readJSON(downloadedPath);

      const transcript = map(json.transcript, (utterance) => {
        const { annotations, ...rest } = utterance;

        const row: Record<string, unknown> = {
          ...rest,
          sessionId: session.sessionId,
        };

        if (annotations) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          annotations.forEach((annotation: any, index: number) => {
            for (const field of annotationFields) {
              const columnKey = `annotator[${annotatorName}][${index}]${field}`;
              row[columnKey] = annotation[field] ?? "";
              annotationColumnKeys.add(columnKey);
            }
          });
        }

        return row;
      });

      utterancesArray = utterancesArray.concat(transcript);

      const sessionObject: Record<string, unknown> = {
        _id: session.sessionId,
        session_id: json.session_id || json.transcript[0]?.session_id,
      };

      if (json.annotations) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.annotations.forEach((annotation: any, index: number) => {
          for (const field of annotationFields) {
            const columnKey = `annotator[${annotatorName}][${index}]${field}`;
            sessionObject[columnKey] = annotation[field] ?? "";
            annotationColumnKeys.add(columnKey);
          }
        });
      }

      sessionsArray.push(sessionObject);
    }

    // OUTPUT UTTERANCES
    if (run.annotationType === "PER_UTTERANCE") {
      const utterancesCsv = json2csv(utterancesArray, {
        keys: [...utteranceKeys, ...annotationColumnKeys],
        emptyFieldValue: "",
      });

      await fse.outputFile(`tmp/${utterancesOutputFile}`, utterancesCsv);
      const utterancesBuffer = await fse.readFile(
        `tmp/${utterancesOutputFile}`,
      );
      await storage.upload({
        file: {
          buffer: utterancesBuffer,
          size: utterancesBuffer.length,
          type: "text/csv",
        },
        uploadPath: utterancesOutputFile,
      });
    }

    // OUTPUT SESSIONS
    if (run.annotationType === "PER_SESSION") {
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

    // OUTPUT META
    const metaObject = {
      teamId,
      projectId: run.project,
      runId: run._id,
      runName: run.name,
      annotator: annotatorName,
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
    };

    const metaCsv = json2csv([metaObject], {
      keys: Object.keys(metaObject),
      emptyFieldValue: "",
    });

    await fse.outputFile(`tmp/${metaOutputFile}`, metaCsv);
    const metaBuffer = await fse.readFile(`tmp/${metaOutputFile}`);
    await storage.upload({
      file: {
        buffer: metaBuffer,
        size: metaBuffer.length,
        type: "text/csv",
      },
      uploadPath: metaOutputFile,
    });

    return {
      statusCode: 200,
    };
  } catch (err) {
    console.log(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err,
      }),
    };
  }
};
