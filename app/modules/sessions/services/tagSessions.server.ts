import { SessionService } from "~/modules/sessions/session";

export default async function tagSessions({
  projectId,
  sessions,
  tags,
}: {
  projectId: string;
  sessions: string[];
  tags: string[];
}) {
  await SessionService.updateMany({
    ids: sessions,
    updates: { tags },
    match: { project: projectId },
  });
}
