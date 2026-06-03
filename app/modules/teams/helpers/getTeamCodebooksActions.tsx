import CodebookAuthorization from "~/modules/codebooks/authorization";
import type { User } from "~/modules/users/users.types";

export default function getTeamCodebooksActions(
  teamId: string,
  user: User | null,
) {
  if (CodebookAuthorization.canCreate(user, teamId)) {
    return [
      {
        action: "CREATE",
        text: "Create codebook",
      },
    ];
  } else {
    return [];
  }
}
