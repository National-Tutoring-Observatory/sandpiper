export const PROJECTS_CREATE_PARAM = "create";

export function projectsUrl(teamId: string): string {
  return `/teams/${teamId}/projects`;
}

export function projectUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}`;
}

export function projectFilesUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}/files`;
}

export function projectSessionsUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}/sessions`;
}

export function projectUploadFilesUrl(
  teamId: string,
  projectId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/upload-files`;
}

export function projectCreateRunUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}/create-run`;
}

export function projectCreateRunSetUrl(
  teamId: string,
  projectId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/create-run-set`;
}

export function projectRunsUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}`;
}

export function projectRunUrl(
  teamId: string,
  projectId: string,
  runId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/runs/${runId}`;
}

export function projectRunSessionsUrl(
  teamId: string,
  projectId: string,
  runId: string,
  sessionId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/runs/${runId}/sessions/${sessionId}`;
}

export function projectRunSetsUrl(teamId: string, projectId: string): string {
  return `/teams/${teamId}/projects/${projectId}/run-sets`;
}

export function projectRunSetUrl(
  teamId: string,
  projectId: string,
  runSetId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/run-sets/${runSetId}`;
}

export function projectRunSetRunUrl(
  teamId: string,
  projectId: string,
  runSetId: string,
  runId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/run-sets/${runSetId}/runs/${runId}`;
}

export function projectRunSetRunSessionsUrl(
  teamId: string,
  projectId: string,
  runSetId: string,
  runId: string,
  sessionId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/run-sets/${runSetId}/runs/${runId}/sessions/${sessionId}`;
}

export function projectEvaluationUrl(
  teamId: string,
  projectId: string,
  runSetId: string,
  evaluationId: string,
): string {
  return `/teams/${teamId}/projects/${projectId}/run-sets/${runSetId}/evaluations/${evaluationId}`;
}
