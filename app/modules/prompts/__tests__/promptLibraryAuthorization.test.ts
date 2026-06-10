import { describe, expect, it } from "vitest";
import type { User } from "~/modules/users/users.types";
import PromptLibraryAuthorization from "../promptLibraryAuthorization";

describe("PromptLibraryAuthorization", () => {
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

  const teamlessUser = {
    _id: "teamless-1",
    username: "teamless",
    role: "USER",
    teams: [] as any[],
  } as User;

  describe("canPublish", () => {
    it("allows super admins to publish", () => {
      expect(PromptLibraryAuthorization.canPublish(superAdminUser)).toBe(true);
    });

    it("denies team admins from publishing", () => {
      expect(PromptLibraryAuthorization.canPublish(teamAdminUser)).toBe(false);
    });

    it("denies team members from publishing", () => {
      expect(PromptLibraryAuthorization.canPublish(teamMemberUser)).toBe(false);
    });

    it("denies users with no team from publishing", () => {
      expect(PromptLibraryAuthorization.canPublish(teamlessUser)).toBe(false);
    });

    it("denies null users from publishing", () => {
      expect(PromptLibraryAuthorization.canPublish(null)).toBe(false);
    });
  });

  describe("canView", () => {
    it("allows super admins to view", () => {
      expect(PromptLibraryAuthorization.canView(superAdminUser)).toBe(true);
    });

    it("allows team admins to view", () => {
      expect(PromptLibraryAuthorization.canView(teamAdminUser)).toBe(true);
    });

    it("allows team members to view", () => {
      expect(PromptLibraryAuthorization.canView(teamMemberUser)).toBe(true);
    });

    it("allows users with no team to view (any authenticated user)", () => {
      expect(PromptLibraryAuthorization.canView(teamlessUser)).toBe(true);
    });

    it("denies null users from viewing", () => {
      expect(PromptLibraryAuthorization.canView(null)).toBe(false);
    });
  });

  describe("canCopy", () => {
    it("allows team admins to copy into a team they belong to", () => {
      expect(PromptLibraryAuthorization.canCopy(teamAdminUser, "team-1")).toBe(
        true,
      );
    });

    it("allows team members to copy into a team they belong to", () => {
      expect(PromptLibraryAuthorization.canCopy(teamMemberUser, "team-1")).toBe(
        true,
      );
    });

    it("denies copy into a team the user does not belong to", () => {
      expect(PromptLibraryAuthorization.canCopy(teamMemberUser, "other")).toBe(
        false,
      );
    });

    it("denies super admins from copying into a team they are not a member of", () => {
      expect(PromptLibraryAuthorization.canCopy(superAdminUser, "team-1")).toBe(
        false,
      );
    });

    it("denies users with no team", () => {
      expect(PromptLibraryAuthorization.canCopy(teamlessUser, "team-1")).toBe(
        false,
      );
    });

    it("denies null users", () => {
      expect(PromptLibraryAuthorization.canCopy(null, "team-1")).toBe(false);
    });

    it("denies when target team is null", () => {
      expect(PromptLibraryAuthorization.canCopy(teamMemberUser, null)).toBe(
        false,
      );
    });
  });
});
