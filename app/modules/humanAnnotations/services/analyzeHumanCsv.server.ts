import { RunService } from "~/modules/runs/run";
import { RunSetService } from "~/modules/runSets/runSet";
import { SessionService } from "~/modules/sessions/session";
import findInvalidAnnotationValues from "../helpers/findInvalidAnnotationValues";
import getAnnotationFieldTypes from "../helpers/getAnnotationFieldTypes";
import parseAnnotationColumn from "../helpers/parseAnnotationColumns";
import type { InvalidAnnotationField } from "../humanAnnotations.types";

interface AnalyzeHumanCsvProps {
  headers: string[];
  sessionIds: string[];
  runSetId: string;
  valuesByField?: Record<string, string[]>;
}

interface MatchedSession {
  sessionId: string;
  name: string;
  _id: string;
}

interface AnalyzeHumanCsvResult {
  annotators: string[];
  annotationFields: string[];
  matchedSessions: MatchedSession[];
  unmatchedSessionIds: string[];
  missingSessionNames: string[];
  fieldTypes: Record<string, string>;
  invalidValues: InvalidAnnotationField[];
}

export default async function analyzeHumanCsv({
  headers,
  sessionIds,
  runSetId,
  valuesByField = {},
}: AnalyzeHumanCsvProps): Promise<AnalyzeHumanCsvResult> {
  const annotatorSet = new Set<string>();
  const fieldSet = new Set<string>();

  for (const header of headers) {
    const parsed = parseAnnotationColumn(header);
    if (!parsed) continue;
    annotatorSet.add(parsed.annotator);
    fieldSet.add(parsed.field);
  }

  const runSet = await RunSetService.findById(runSetId);
  if (!runSet) {
    throw new Error("Run set not found");
  }

  const sessions = await SessionService.find({
    match: { _id: { $in: runSet.sessions } },
  });

  const runs = runSet.runs?.length
    ? await RunService.find({
        match: { _id: { $in: runSet.runs } },
        select: "snapshot.prompt.annotationSchema isHuman",
      })
    : [];
  const fieldTypes = getAnnotationFieldTypes(runs);

  const matchedSessions: MatchedSession[] = [];
  const unmatchedSessionIds: string[] = [];

  for (const csvSessionId of sessionIds) {
    const session = sessions.find((s) => {
      if (s.name === csvSessionId) return true;
      const nameWithoutExt = s.name.replace(/\.[^.]+$/, "");
      return nameWithoutExt === csvSessionId;
    });

    if (session) {
      matchedSessions.push({
        sessionId: csvSessionId,
        name: session.name,
        _id: session._id,
      });
    } else {
      unmatchedSessionIds.push(csvSessionId);
    }
  }

  const matchedRunSetIds = new Set(matchedSessions.map((s) => s._id));
  const missingSessions = sessions.filter((s) => !matchedRunSetIds.has(s._id));

  return {
    annotators: Array.from(annotatorSet),
    annotationFields: Array.from(fieldSet),
    matchedSessions,
    unmatchedSessionIds,
    missingSessionNames: missingSessions.map((s) => s.name),
    fieldTypes,
    invalidValues: findInvalidAnnotationValues(valuesByField, fieldTypes),
  };
}
