import path from "path";
import { data } from "react-router";
import requireAuth from "~/modules/authentication/helpers/requireAuth";
import ProjectAuthorization from "~/modules/projects/authorization";
import { ProjectService } from "~/modules/projects/project";
import { RunSetService } from "~/modules/runSets/runSet";
import getStorageAdapter from "~/modules/storage/helpers/getStorageAdapter";
import buildAnnotationSchemaFromHeaders from "../helpers/buildAnnotationSchemaFromHeaders";
import analyzeHumanCsv from "../services/analyzeHumanCsv.server";
import createHumanRun from "../services/createHumanRun.server";
import uploadHumanAnnotations from "../services/uploadHumanAnnotations.server";
import type { Route } from "./+types/humanAnnotations.route";

export async function action({ request, params }: Route.ActionArgs) {
  const user = await requireAuth({ request });

  const runSet = await RunSetService.findById(params.runSetId);
  if (!runSet) {
    return data({ errors: { general: "Run set not found" } }, { status: 404 });
  }

  const project = await ProjectService.findById(runSet.project);
  if (!project) {
    return data({ errors: { general: "Project not found" } }, { status: 404 });
  }

  if (!ProjectAuthorization.Runs.canManage(user, project)) {
    return data({ errors: { general: "Access denied" } }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const { intent, payload } = await request.json();

    if (intent === "ANALYZE_HUMAN_CSV") {
      const result = await analyzeHumanCsv({
        headers: payload.headers,
        sessionIds: payload.sessionIds,
        valuesByField: payload.valuesByField,
        runSetId: params.runSetId,
      });
      return data({ success: true, intent, data: result });
    }

    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body = JSON.parse(String(formData.get("body")));

    if (body.intent === "UPLOAD_HUMAN_CSV") {
      const file = formData.get("file") as File;
      if (!file) {
        return data(
          { errors: { general: "No file provided" } },
          { status: 400 },
        );
      }

      const { headers, annotators } = body.payload;

      const csvBuffer = Buffer.from(await file.arrayBuffer());

      const analysis = await analyzeHumanCsv({
        headers,
        sessionIds: body.payload.sessionIds,
        runSetId: params.runSetId,
      });

      if (analysis.missingSessionNames.length > 0) {
        const names = analysis.missingSessionNames.join(", ");
        return data(
          {
            errors: {
              general: `CSV is missing sessions from the run set: ${names}`,
            },
          },
          { status: 400 },
        );
      }

      const csvPath = `storage/${runSet.project}/uploads/${path.basename(file.name)}`;
      const storage = getStorageAdapter();
      await storage.upload({
        file: {
          buffer: csvBuffer,
          size: csvBuffer.length,
          type: "text/csv",
        },
        uploadPath: csvPath,
      });

      const annotationSchema = buildAnnotationSchemaFromHeaders(
        headers,
        analysis.fieldTypes,
      );

      const matchedSessionIds = analysis.matchedSessions.map((s) => s._id);
      const runIds: string[] = [];

      for (const annotator of annotators) {
        const run = await createHumanRun({
          project: runSet.project,
          name: annotator,
          annotationType: runSet.annotationType as
            | "PER_UTTERANCE"
            | "PER_SESSION",
          sessionIds: matchedSessionIds,
          annotationSchema,
        });
        runIds.push(run._id);
      }

      const addResult = await RunSetService.addRunsToRunSet(
        params.runSetId,
        runIds,
      );
      if (addResult.errors.length > 0) {
        return data(
          { errors: { general: addResult.errors.join(", ") } },
          { status: 400 },
        );
      }

      await uploadHumanAnnotations({
        runIds,
        annotators,
        headers,
        fieldTypes: analysis.fieldTypes,
        csvPath,
        projectId: runSet.project,
        matchedSessions: analysis.matchedSessions,
      });

      return data({ success: true, intent: "UPLOAD_HUMAN_CSV" });
    }

    return data({ errors: { general: "Invalid intent" } }, { status: 400 });
  }

  return data({ errors: { general: "Invalid request" } }, { status: 400 });
}
