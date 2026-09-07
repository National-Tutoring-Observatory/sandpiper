import { SessionService } from "~/modules/sessions/session";
import { TagService } from "~/modules/tags/tag";

type TagSessionsResult =
  | { success: true }
  | { success: false; errors: Record<string, string> };

export default async function tagSessions({
  projectId,
  teamId,
  sessions,
  tags,
}: {
  projectId: string;
  teamId: string;
  sessions: unknown;
  tags: unknown;
}): Promise<TagSessionsResult> {
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((id) => typeof id === "string");

  if (!isStringArray(sessions) || sessions.length === 0) {
    return { success: false, errors: { sessions: "Invalid sessions" } };
  }
  if (!isStringArray(tags)) {
    return { success: false, errors: { tags: "Invalid tags" } };
  }

  const tagIds = [...new Set(tags)];
  const ownedTagCount = await TagService.count({
    _id: { $in: tagIds },
    team: teamId,
  });
  if (ownedTagCount !== tagIds.length) {
    return { success: false, errors: { tags: "Invalid tag" } };
  }

  await SessionService.updateMany({
    ids: sessions,
    updates: { tags: tagIds },
    match: { project: projectId },
  });

  return { success: true };
}
