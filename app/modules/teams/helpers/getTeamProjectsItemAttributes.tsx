import getDateString from "~/modules/app/helpers/getDateString";
import ProjectAuthorization from "~/modules/projects/authorization";
import { projectUrl } from "~/modules/projects/helpers/projectUrls";
import type { Project } from "~/modules/projects/projects.types";
import type { User } from "~/modules/users/users.types";

export default function getTeamProjectsItemAttributes(
  item: Project,
  teamId: string,
  user: User,
) {
  const canCreate = ProjectAuthorization.canCreate(user, teamId);

  return {
    id: item._id,
    title: item.name,
    to: canCreate ? projectUrl(teamId, item._id) : undefined,
    meta: [
      {
        text: `Created at - ${getDateString(item.createdAt)}`,
      },
    ],
  };
}
