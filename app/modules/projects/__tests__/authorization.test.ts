import { describe, expect, it } from "vitest";
import type { User } from "~/modules/users/users.types";
import ProjectAuthorization from "../authorization";
import type { Project } from "../projects.types";

describe("ProjectAuthorization", () => {
  const superAdminUser = {
    _id: "super-admin-1",
    username: "super_admin",
    role: "SUPER_ADMIN",
    teams: [] as any,
  } as User;

  const teamAdminUser = {
    _id: "team-admin-1",
    username: "team_admin",
    role: "USER",
    teams: [{ team: "team-1", role: "ADMIN" }],
  } as User;

  const teamMemberUser = {
    _id: "team-member-1",
    username: "team_member",
    role: "USER",
    teams: [{ team: "team-1", role: "MEMBER" }],
  } as User;

  const nonTeamUser = {
    _id: "non-team-1",
    username: "non_team",
    role: "USER",
    teams: [] as any,
  } as User;

  // Shared test fixtures
  const projectInTeam1: Project = {
    _id: "project-1",
    name: "Test Project",
    team: "team-1",
    createdAt: "2025-01-01",
    hasErrored: false,
    isUploadingFiles: false,
    isConvertingFiles: false,
    hasSetupProject: true,
    hasMtmDataset: false,
  };

  const projectInTeam2: Project = {
    ...projectInTeam1,
    _id: "project-2",
    team: "team-2",
  };

  const projectCreatedByTeamMember: Project = {
    ...projectInTeam1,
    _id: "project-3",
    createdBy: "team-member-1",
  };

  describe("canCreate", () => {
    it("allows team admins to create projects in their team", () => {
      expect(ProjectAuthorization.canCreate(teamAdminUser, "team-1")).toBe(
        true,
      );
    });

    it("denies super admins to create projects in a team", () => {
      expect(ProjectAuthorization.canCreate(superAdminUser, "team-1")).toBe(
        false,
      );
    });

    it("allows team members to create projects", () => {
      expect(ProjectAuthorization.canCreate(teamMemberUser, "team-1")).toBe(
        true,
      );
    });

    it("denies non-members from creating projects", () => {
      expect(ProjectAuthorization.canCreate(nonTeamUser, "team-1")).toBe(false);
      expect(ProjectAuthorization.canCreate(teamAdminUser, "team-999")).toBe(
        false,
      );
    });

    it("denies null users from creating projects", () => {
      expect(ProjectAuthorization.canCreate(null, "team-1")).toBe(false);
    });
  });

  describe("canView", () => {
    it("allows team members to view projects in their team", () => {
      expect(ProjectAuthorization.canView(teamAdminUser, projectInTeam1)).toBe(
        true,
      );
      expect(ProjectAuthorization.canView(teamMemberUser, projectInTeam1)).toBe(
        true,
      );
    });

    it("allows super admins to view projects in any team", () => {
      expect(ProjectAuthorization.canView(superAdminUser, projectInTeam1)).toBe(
        true,
      );
    });

    it("denies non-members from viewing projects", () => {
      expect(ProjectAuthorization.canView(nonTeamUser, projectInTeam1)).toBe(
        false,
      );
      expect(ProjectAuthorization.canView(teamAdminUser, projectInTeam2)).toBe(
        false,
      );
    });

    it("denies null users from viewing projects", () => {
      expect(ProjectAuthorization.canView(null, projectInTeam1)).toBe(false);
    });
  });

  describe("canUpdate", () => {
    it("allows team admins to update projects in their team", () => {
      expect(
        ProjectAuthorization.canUpdate(teamAdminUser, projectInTeam1),
      ).toBe(true);
    });

    it("allows team admins to update projects created by other team members", () => {
      expect(
        ProjectAuthorization.canUpdate(
          teamAdminUser,
          projectCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("allows team members to update projects they created", () => {
      expect(
        ProjectAuthorization.canUpdate(
          teamMemberUser,
          projectCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("denies team members from updating projects created by other team members", () => {
      expect(
        ProjectAuthorization.canUpdate(teamMemberUser, projectInTeam1),
      ).toBe(false);
    });

    it("denies team members from updating projects from other teams", () => {
      expect(
        ProjectAuthorization.canUpdate(teamMemberUser, projectInTeam2),
      ).toBe(false);
    });

    it("denies super admins to update projects in a team", () => {
      expect(
        ProjectAuthorization.canUpdate(superAdminUser, projectInTeam1),
      ).toBe(false);
    });

    it("denies non-members from updating projects", () => {
      expect(ProjectAuthorization.canUpdate(nonTeamUser, projectInTeam1)).toBe(
        false,
      );
    });

    it("denies null users from updating projects", () => {
      expect(ProjectAuthorization.canUpdate(null, projectInTeam1)).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("allows team admins to delete projects they created", () => {
      expect(
        ProjectAuthorization.canDelete(teamAdminUser, projectInTeam1),
      ).toBe(true);
    });

    it("allows team admins to delete projects created by other team members", () => {
      expect(
        ProjectAuthorization.canDelete(
          teamAdminUser,
          projectCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("allows team members to delete projects they created", () => {
      expect(
        ProjectAuthorization.canDelete(
          teamMemberUser,
          projectCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("denies team members from deleting projects created by other team members", () => {
      expect(
        ProjectAuthorization.canDelete(teamMemberUser, projectInTeam1),
      ).toBe(false);
    });

    it("denies team members from deleting projects from other teams", () => {
      expect(
        ProjectAuthorization.canDelete(teamMemberUser, projectInTeam2),
      ).toBe(false);
    });

    it("denies super admins to delete projects in a team", () => {
      expect(
        ProjectAuthorization.canDelete(superAdminUser, projectInTeam1),
      ).toBe(false);
    });

    it("denies non-members from deleting projects", () => {
      expect(ProjectAuthorization.canDelete(nonTeamUser, projectInTeam1)).toBe(
        false,
      );
    });

    it("denies null users from deleting projects", () => {
      expect(ProjectAuthorization.canDelete(null, projectInTeam1)).toBe(false);
    });

    it("allows team admins to delete projects even when createdBy is not set", () => {
      const projectWithoutCreator: Project = {
        ...projectInTeam1,
        createdBy: undefined,
      };
      expect(
        ProjectAuthorization.canDelete(teamAdminUser, projectWithoutCreator),
      ).toBe(true);
    });

    it("denies team members from deleting projects when createdBy is not set", () => {
      const projectWithoutCreator: Project = {
        ...projectInTeam1,
        createdBy: undefined,
      };
      expect(
        ProjectAuthorization.canDelete(teamMemberUser, projectWithoutCreator),
      ).toBe(false);
    });
  });

  describe("Runs", () => {
    describe("canManage", () => {
      it("allows team members to manage runs in their team", () => {
        expect(
          ProjectAuthorization.Runs.canManage(teamAdminUser, projectInTeam1),
        ).toBe(true);
        expect(
          ProjectAuthorization.Runs.canManage(teamMemberUser, projectInTeam1),
        ).toBe(true);
      });

      it("denies super admins to manage runs in a team", () => {
        expect(
          ProjectAuthorization.Runs.canManage(superAdminUser, projectInTeam1),
        ).toBe(false);
      });

      it("denies non-members from managing runs", () => {
        expect(
          ProjectAuthorization.Runs.canManage(nonTeamUser, projectInTeam1),
        ).toBe(false);
        expect(
          ProjectAuthorization.Runs.canManage(teamAdminUser, projectInTeam2),
        ).toBe(false);
      });

      it("denies null users from managing runs", () => {
        expect(ProjectAuthorization.Runs.canManage(null, projectInTeam1)).toBe(
          false,
        );
      });
    });
  });

  describe("Annotations", () => {
    describe("canManage", () => {
      it("allows team members to manage annotations in their team", () => {
        expect(
          ProjectAuthorization.Annotations.canManage(
            teamAdminUser,
            projectInTeam1,
          ),
        ).toBe(true);
        expect(
          ProjectAuthorization.Annotations.canManage(
            teamMemberUser,
            projectInTeam1,
          ),
        ).toBe(true);
      });

      it("denies super admins to manage annotations in a team", () => {
        expect(
          ProjectAuthorization.Annotations.canManage(
            superAdminUser,
            projectInTeam1,
          ),
        ).toBe(false);
      });

      it("denies non-members from managing annotations", () => {
        expect(
          ProjectAuthorization.Annotations.canManage(
            nonTeamUser,
            projectInTeam1,
          ),
        ).toBe(false);
        expect(
          ProjectAuthorization.Annotations.canManage(
            teamAdminUser,
            projectInTeam2,
          ),
        ).toBe(false);
      });

      it("denies null users from managing annotations", () => {
        expect(
          ProjectAuthorization.Annotations.canManage(null, projectInTeam1),
        ).toBe(false);
      });
    });
  });

  describe("cross-team scenarios", () => {
    it("handles users with multiple team memberships correctly", () => {
      const multiTeamUser: User = {
        ...teamAdminUser,
        teams: [
          { team: "team-1", role: "ADMIN" },
          { team: "team-2", role: "MEMBER" },
        ],
      };

      // Can manage projects in team-1 (is admin)
      expect(ProjectAuthorization.canCreate(multiTeamUser, "team-1")).toBe(
        true,
      );
      expect(
        ProjectAuthorization.canUpdate(multiTeamUser, projectInTeam1),
      ).toBe(true);

      // Can also create in team-2 (is a member)
      expect(ProjectAuthorization.canCreate(multiTeamUser, "team-2")).toBe(
        true,
      );
      expect(
        ProjectAuthorization.canUpdate(multiTeamUser, projectInTeam2),
      ).toBe(false);
    });
  });
});
