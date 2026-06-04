import { describe, expect, it } from "vitest";
import type { User } from "~/modules/users/users.types";
import CodebookAuthorization from "../authorization";
import type { Codebook } from "../codebooks.types";

describe("CodebookAuthorization", () => {
  const superAdminUser = {
    _id: "super-admin-1",
    username: "super_admin",
    role: "SUPER_ADMIN",
    teams: [] as any[],
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
    teams: [] as any[],
  } as User;

  const multiTeamUser = {
    _id: "multi-team-1",
    username: "multi_team",
    role: "USER",
    teams: [
      { team: "team-1", role: "MEMBER" },
      { team: "team-2", role: "ADMIN" },
    ],
  } as User;

  const codebookInTeam1: Codebook = {
    _id: "codebook-1",
    name: "Test Codebook",
    description: "A test codebook",
    team: "team-1",
    createdAt: "2024-01-01",
    productionVersion: 1,
    createdBy: "team-admin-1",
  };

  const codebookInTeam2: Codebook = {
    ...codebookInTeam1,
    _id: "codebook-2",
    team: "team-2",
  };

  const codebookCreatedByTeamMember: Codebook = {
    ...codebookInTeam1,
    _id: "codebook-3",
    createdBy: "team-member-1",
  };

  describe("canCreate", () => {
    it("allows team admins to create codebooks in their team", () => {
      expect(CodebookAuthorization.canCreate(teamAdminUser, "team-1")).toBe(
        true,
      );
    });

    it("denies super admins to create codebooks in a team", () => {
      expect(CodebookAuthorization.canCreate(superAdminUser, "team-1")).toBe(
        false,
      );
    });

    it("denies team members from creating codebooks", () => {
      expect(CodebookAuthorization.canCreate(teamMemberUser, "team-1")).toBe(
        false,
      );
    });

    it("denies non-members from creating codebooks", () => {
      expect(CodebookAuthorization.canCreate(nonTeamUser, "team-1")).toBe(
        false,
      );
    });

    it("denies null users from creating codebooks", () => {
      expect(CodebookAuthorization.canCreate(null, "team-1")).toBe(false);
    });
  });

  describe("canView", () => {
    it("allows team members to view codebooks in their team", () => {
      expect(
        CodebookAuthorization.canView(teamMemberUser, codebookInTeam1),
      ).toBe(true);
    });

    it("allows team admins to view codebooks in their team", () => {
      expect(
        CodebookAuthorization.canView(teamAdminUser, codebookInTeam1),
      ).toBe(true);
    });

    it("allows super admins to view codebooks in any team", () => {
      expect(
        CodebookAuthorization.canView(superAdminUser, codebookInTeam1),
      ).toBe(true);
    });

    it("denies non-members from viewing codebooks in another team", () => {
      expect(CodebookAuthorization.canView(nonTeamUser, codebookInTeam1)).toBe(
        false,
      );
    });

    it("denies null users from viewing codebooks in a team", () => {
      expect(CodebookAuthorization.canView(null, codebookInTeam1)).toBe(false);
    });
  });

  describe("canUpdate", () => {
    it("allows team admins to update their own codebooks", () => {
      expect(
        CodebookAuthorization.canUpdate(teamAdminUser, codebookInTeam1),
      ).toBe(true);
    });

    it("allows team members to update their own codebooks", () => {
      expect(
        CodebookAuthorization.canUpdate(
          teamMemberUser,
          codebookCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("allows team admins to update any codebook in their team", () => {
      expect(
        CodebookAuthorization.canUpdate(
          teamAdminUser,
          codebookCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("denies team members from updating other members codebooks", () => {
      expect(
        CodebookAuthorization.canUpdate(teamMemberUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies team members from updating codebooks from other teams", () => {
      expect(
        CodebookAuthorization.canUpdate(teamMemberUser, codebookInTeam2),
      ).toBe(false);
    });

    it("denies super admins to update codebooks in a team", () => {
      expect(
        CodebookAuthorization.canUpdate(superAdminUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies non-members from updating codebooks", () => {
      expect(
        CodebookAuthorization.canUpdate(nonTeamUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies null users from updating codebooks", () => {
      expect(CodebookAuthorization.canUpdate(null, codebookInTeam1)).toBe(
        false,
      );
    });
  });

  describe("canDelete", () => {
    it("allows team admins to delete their own codebooks", () => {
      expect(
        CodebookAuthorization.canDelete(teamAdminUser, codebookInTeam1),
      ).toBe(true);
    });

    it("allows team members to delete their own codebooks", () => {
      expect(
        CodebookAuthorization.canDelete(
          teamMemberUser,
          codebookCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("allows team admins to delete any codebook in their team", () => {
      expect(
        CodebookAuthorization.canDelete(
          teamAdminUser,
          codebookCreatedByTeamMember,
        ),
      ).toBe(true);
    });

    it("denies team members from deleting other users' codebooks", () => {
      expect(
        CodebookAuthorization.canDelete(teamMemberUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies team members from deleting codebooks from other teams", () => {
      expect(
        CodebookAuthorization.canDelete(teamMemberUser, codebookInTeam2),
      ).toBe(false);
    });

    it("denies super admins to delete codebooks in a team", () => {
      expect(
        CodebookAuthorization.canDelete(superAdminUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies non-members from deleting codebooks", () => {
      expect(
        CodebookAuthorization.canDelete(nonTeamUser, codebookInTeam1),
      ).toBe(false);
    });

    it("denies null users from deleting codebooks", () => {
      expect(CodebookAuthorization.canDelete(null, codebookInTeam1)).toBe(
        false,
      );
    });
  });

  describe("multiple team memberships", () => {
    it("allows users to manage codebooks in all their teams", () => {
      const multiTeamCodebook1: Codebook = {
        ...codebookInTeam1,
        _id: "codebook-mt-1",
        team: "team-1",
        createdBy: "multi-team-1",
      };

      const multiTeamCodebook2: Codebook = {
        ...codebookInTeam1,
        _id: "codebook-mt-2",
        team: "team-2",
        createdBy: "multi-team-1",
      };

      expect(
        CodebookAuthorization.canDelete(multiTeamUser, multiTeamCodebook1),
      ).toBe(true);
      expect(
        CodebookAuthorization.canDelete(multiTeamUser, multiTeamCodebook2),
      ).toBe(true);
    });
  });
});
