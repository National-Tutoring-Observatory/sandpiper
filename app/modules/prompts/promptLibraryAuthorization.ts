import type { User } from "~/modules/users/users.types";
import { userIsSuperAdmin } from "../authorization/helpers/superAdmin";
import PromptAuthorization from "./authorization";

const PromptLibraryAuthorization = {
  canPublish(user: User | null): boolean {
    return userIsSuperAdmin(user);
  },

  canView(user: User | null): boolean {
    return Boolean(user);
  },

  canCopy(user: User | null, targetTeamId: string | null | undefined): boolean {
    if (!targetTeamId) return false;
    return PromptAuthorization.canCreate(user, targetTeamId);
  },
};

type PromptLibraryAuthorizationShape = {
  [K in keyof typeof PromptLibraryAuthorization]: boolean;
};

export default PromptLibraryAuthorization;
export type { PromptLibraryAuthorizationShape };
