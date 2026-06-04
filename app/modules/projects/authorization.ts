import type { User } from "~/modules/users/users.types";
import { userIsSuperAdmin } from "../authorization/helpers/superAdmin";
import {
  userIsTeamAdmin,
  userIsTeamMember,
} from "../authorization/helpers/teamMembership";
import type { Project } from "./projects.types";

const getTeamId = (project: Project): string => {
  return typeof project.team === "string" ? project.team : project.team._id;
};

const getProjectCreatorId = (project: Project): string | null => {
  if (!project.createdBy) return null;
  return typeof project.createdBy === "string"
    ? project.createdBy
    : project.createdBy._id;
};

const canUserManageProject = (user: User | null, project: Project): boolean => {
  if (!user) {
    return false;
  }

  const teamId = getTeamId(project);
  if (!teamId) return false;

  const isAdmin = userIsTeamAdmin(user, teamId);
  const isTeamMember = userIsTeamMember(user, teamId);
  const ownsProject = user._id === getProjectCreatorId(project);

  return isAdmin || (isTeamMember && ownsProject);
};

const ProjectAuthorization = {
  canCreate(user: User | null, teamId: string): boolean {
    return userIsTeamMember(user, teamId);
  },

  canView(user: User | null, project: Project): boolean {
    if (!user) return false;
    if (userIsSuperAdmin(user)) return true;
    const teamId = getTeamId(project);
    if (!teamId) return false;
    return userIsTeamMember(user, teamId);
  },

  canUpdate(user: User | null, project: Project): boolean {
    return canUserManageProject(user, project);
  },

  canDelete(user: User | null, project: Project): boolean {
    return canUserManageProject(user, project);
  },

  Runs: {
    canManage(user: User | null, project: Project): boolean {
      return userIsTeamMember(user, getTeamId(project));
    },
  },

  Annotations: {
    canManage(user: User | null, project: Project): boolean {
      return userIsTeamMember(user, getTeamId(project));
    },
  },
};

type RunsAuthorizationShape = {
  [K in keyof typeof ProjectAuthorization.Runs]: boolean;
};

type AnnotationsAuthorizationShape = {
  [K in keyof typeof ProjectAuthorization.Annotations]: boolean;
};

type ProjectAuthorizationShape = {
  [K in Exclude<
    keyof typeof ProjectAuthorization,
    "Runs" | "Annotations"
  >]: boolean;
} & {
  runs: RunsAuthorizationShape;
  annotations: AnnotationsAuthorizationShape;
};

export default ProjectAuthorization;
export type {
  AnnotationsAuthorizationShape,
  ProjectAuthorizationShape,
  RunsAuthorizationShape,
};
