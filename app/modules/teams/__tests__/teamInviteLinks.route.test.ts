import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/teamInviteLinks.route";
import { TeamService } from "../team";
import { TeamInviteService } from "../teamInvites";

async function setupAdmin() {
  const team = await TeamService.create({ name: "T" });
  const admin = await UserService.create({
    username: "admin",
    teams: [{ team: team._id, role: "ADMIN" }],
  });
  const cookie = await loginUser(admin._id);
  return { team, admin, cookie };
}

describe("teamInviteLinks.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  describe("loader", () => {
    it("redirects non-admins away", async () => {
      const team = await TeamService.create({ name: "T" });
      const member = await UserService.create({
        username: "member",
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      const cookie = await loginUser(member._id);

      const resp = (await loader({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            headers: { cookie },
          },
        ),
        params: { teamId: team._id },
      } as any)) as Response;

      expect(resp.status).toBe(302);
    });

    it("returns paginated invites for admins", async () => {
      const { team, admin, cookie } = await setupAdmin();
      await TeamInviteService.create({
        team: team._id,
        name: "Alpha",
        maxUses: 5,
        createdBy: admin._id,
      });
      const result = (await loader({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            headers: { cookie },
          },
        ),
        params: { teamId: team._id },
      } as any)) as any;
      expect(result.invites.data).toHaveLength(1);
      expect(result.invites.data[0].name).toBe("Alpha");
    });
  });

  describe("action CREATE_TEAM_INVITE_LINK", () => {
    it("denies non-admins", async () => {
      const team = await TeamService.create({ name: "T" });
      const member = await UserService.create({
        username: "member",
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      const cookie = await loginUser(member._id);
      const resp = (await action({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              intent: "CREATE_TEAM_INVITE_LINK",
              payload: { name: "Try", maxUses: 5 },
            }),
          },
        ),
        params: { teamId: team._id },
      } as any)) as any;
      expect(resp.init?.status).toBe(403);
    });

    it("rejects empty name", async () => {
      const { team, cookie } = await setupAdmin();
      const resp = (await action({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              intent: "CREATE_TEAM_INVITE_LINK",
              payload: { name: "   ", maxUses: 5 },
            }),
          },
        ),
        params: { teamId: team._id },
      } as any)) as any;
      expect(resp.init?.status).toBe(400);
    });

    it("rejects out-of-range maxUses", async () => {
      const { team, cookie } = await setupAdmin();
      const resp = (await action({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              intent: "CREATE_TEAM_INVITE_LINK",
              payload: { name: "OK", maxUses: 0 },
            }),
          },
        ),
        params: { teamId: team._id },
      } as any)) as any;
      expect(resp.init?.status).toBe(400);
    });

    it("ignores client-supplied role and creates MEMBER invite", async () => {
      const { team, cookie } = await setupAdmin();
      const resp = (await action({
        request: new Request(
          `http://localhost/teams/${team._id}/invite-links`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              intent: "CREATE_TEAM_INVITE_LINK",
              payload: { name: "OK", maxUses: 5, role: "ADMIN" },
            }),
          },
        ),
        params: { teamId: team._id },
      } as any)) as any;
      expect(resp.data?.invite?.role).toBe("MEMBER");
    });
  });

  describe("action REVOKE_TEAM_INVITE_LINK", () => {
    it("prevents cross-team IDOR", async () => {
      const { team: teamA, cookie } = await setupAdmin();
      const teamB = await TeamService.create({ name: "B" });
      const fromB = await TeamInviteService.create({
        team: teamB._id,
        name: "Foreign",
        maxUses: 5,
        createdBy: "507f1f77bcf86cd799439012",
      });
      const resp = (await action({
        request: new Request(
          `http://localhost/teams/${teamA._id}/invite-links`,
          {
            method: "POST",
            headers: { cookie, "content-type": "application/json" },
            body: JSON.stringify({
              intent: "REVOKE_TEAM_INVITE_LINK",
              payload: { inviteLinkId: fromB._id },
            }),
          },
        ),
        params: { teamId: teamA._id },
      } as any)) as any;
      expect(resp.init?.status).toBe(404);

      const stillActive = await TeamInviteService.findById(fromB._id);
      expect(stillActive?.revokedAt).toBeFalsy();
    });
  });
});
