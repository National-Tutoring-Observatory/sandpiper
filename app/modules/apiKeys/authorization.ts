import type { User } from "~/modules/users/users.types";
import { userIsSuperAdmin } from "../authorization/helpers/superAdmin";
import { userIsTeamAdmin } from "../authorization/helpers/teamMembership";

const ApiKeysAuthorization = {
  canView(user: User | null, teamId: string): boolean {
    return userIsSuperAdmin(user) || userIsTeamAdmin(user, teamId);
  },
};

type ApiKeysAuthorizationShape = {
  [K in keyof typeof ApiKeysAuthorization]: boolean;
};

export default ApiKeysAuthorization;
export type { ApiKeysAuthorizationShape };
