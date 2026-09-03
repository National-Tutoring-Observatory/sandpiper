import getReferenceId from "~/helpers/getReferenceId";
import type { User } from "~/modules/users/users.types";
import { userIsTeamMember } from "../authorization/helpers/teamMembership";
import type { Tag } from "./tags.types";

const getTeamId = (tag: Tag): string => getReferenceId(tag.team);

const canAccessTag = (user: User | null, tag: Tag): boolean => {
  const teamId = getTeamId(tag);
  if (!teamId) return false;
  return userIsTeamMember(user, teamId);
};

const TagAuthorization = {
  canCreate(user: User | null, teamId: string): boolean {
    return userIsTeamMember(user, teamId);
  },

  canView(user: User | null, tag: Tag): boolean {
    return canAccessTag(user, tag);
  },

  canUpdate(user: User | null, tag: Tag): boolean {
    return canAccessTag(user, tag);
  },

  canDelete(user: User | null, tag: Tag): boolean {
    return canAccessTag(user, tag);
  },
};

type TagAuthorizationShape = {
  [K in keyof typeof TagAuthorization]: boolean;
};

export default TagAuthorization;
export type { TagAuthorizationShape };
