import type { User } from "~/modules/users/users.types";
import { userIsSuperAdmin } from "../authorization/helpers/superAdmin";

const PromptLibraryAuthorization = {
  canPublish(user: User | null): boolean {
    return userIsSuperAdmin(user);
  },

  canView(user: User | null): boolean {
    return Boolean(user);
  },

  canCopy(user: User | null): boolean {
    return Boolean(user);
  },
};

type PromptLibraryAuthorizationShape = {
  [K in keyof typeof PromptLibraryAuthorization]: boolean;
};

export default PromptLibraryAuthorization;
export type { PromptLibraryAuthorizationShape };
