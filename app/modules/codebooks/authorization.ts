import type { User } from "~/modules/users/users.types";
import { userIsSuperAdmin } from "../authorization/helpers/superAdmin";
import {
  userIsTeamAdmin,
  userIsTeamMember,
} from "../authorization/helpers/teamMembership";
import type { Codebook } from "./codebooks.types";

const getTeamId = (codebook: Codebook): string => {
  return typeof codebook.team === "string" ? codebook.team : codebook.team._id;
};

const getCodebookCreatorId = (codebook: Codebook): string | null => {
  if (!codebook.createdBy) return null;
  return typeof codebook.createdBy === "string"
    ? codebook.createdBy
    : codebook.createdBy._id;
};

const canUserManageCodebook = (
  user: User | null,
  codebook: Codebook,
): boolean => {
  if (!user) {
    return false;
  }

  const teamId = getTeamId(codebook);
  if (!teamId) return false;

  const isAdmin = userIsTeamAdmin(user, teamId);
  const isTeamMember = userIsTeamMember(user, teamId);
  const ownsCodebook = user._id === getCodebookCreatorId(codebook);

  return isAdmin || (isTeamMember && ownsCodebook);
};

const CodebookAuthorization = {
  canCreate(user: User | null, teamId: string): boolean {
    return userIsTeamAdmin(user, teamId);
  },

  canView(user: User | null, codebook: Codebook): boolean {
    if (!user) return false;
    if (userIsSuperAdmin(user)) return true;
    const teamId = getTeamId(codebook);
    if (!teamId) return false;
    return userIsTeamMember(user, teamId);
  },

  canUpdate(user: User | null, codebook: Codebook): boolean {
    return canUserManageCodebook(user, codebook);
  },

  canDelete(user: User | null, codebook: Codebook): boolean {
    return canUserManageCodebook(user, codebook);
  },
};

type CodebookAuthorizationShape = {
  [K in keyof typeof CodebookAuthorization]: boolean;
};

export default CodebookAuthorization;
export type { CodebookAuthorizationShape };
