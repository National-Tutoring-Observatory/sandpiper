import { beforeEach, describe, expect, it } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/teamInviteLink.route";
import { TeamService } from "../team";
import { TeamInviteService } from "../teamInvites";

describe("teamInviteLink.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("prevents cross-team IDOR on loader", async () => {
    const teamA = await TeamService.create({ name: "A" });
    const teamB = await TeamService.create({ name: "B" });
    const admin = await UserService.create({
      username: "admin",
      teams: [{ team: teamA._id, role: "ADMIN" }],
    });
    const fromB = await TeamInviteService.create({
      team: teamB._id,
      name: "Foreign",
      maxUses: 5,
      createdBy: admin._id,
    });
    const cookie = await loginUser(admin._id);

    const resp = (await loader({
      request: new Request(
        `http://localhost/teams/${teamA._id}/invite-links/${fromB._id}`,
        { headers: { cookie } },
      ),
      params: { teamId: teamA._id, inviteLinkId: fromB._id },
    } as any)) as Response;

    expect(resp.status).toBe(302);
  });

  it("returns invite + signups for the owning team", async () => {
    const team = await TeamService.create({ name: "T" });
    const admin = await UserService.create({
      username: "admin",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const invite = await TeamInviteService.create({
      team: team._id,
      name: "Here",
      maxUses: 5,
      createdBy: admin._id,
    });
    await UserService.create({
      username: "signup1",
      teams: [{ team: team._id, role: "MEMBER", viaTeamInvite: invite._id }],
    });
    const cookie = await loginUser(admin._id);

    const result = (await loader({
      request: new Request(
        `http://localhost/teams/${team._id}/invite-links/${invite._id}`,
        { headers: { cookie } },
      ),
      params: { teamId: team._id, inviteLinkId: invite._id },
    } as any)) as any;

    expect(result.invite._id).toBe(invite._id);
    expect(result.signups).toHaveLength(1);
    expect(result.signups[0].username).toBe("signup1");
  });

  it("revokes via action and writes revokedBy", async () => {
    const team = await TeamService.create({ name: "T" });
    const admin = await UserService.create({
      username: "admin",
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const invite = await TeamInviteService.create({
      team: team._id,
      name: "Revoke",
      maxUses: 5,
      createdBy: admin._id,
    });
    const cookie = await loginUser(admin._id);

    await action({
      request: new Request(
        `http://localhost/teams/${team._id}/invite-links/${invite._id}`,
        {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({ intent: "REVOKE_TEAM_INVITE_LINK" }),
        },
      ),
      params: { teamId: team._id, inviteLinkId: invite._id },
    } as any);

    const updated = await TeamInviteService.findById(invite._id);
    expect(updated?.revokedAt).toBeDefined();
    expect(updated?.revokedBy).toBe(admin._id);
  });
});
