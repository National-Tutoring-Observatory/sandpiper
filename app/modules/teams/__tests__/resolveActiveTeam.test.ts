import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import resolveActiveTeam from "../helpers/resolveActiveTeam.server";

function withCookie(teamId: string): Request {
  return new Request("http://localhost/", {
    headers: { cookie: `sandpiper.activeTeamId=${teamId}` },
  });
}

describe("resolveActiveTeam", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("returns null when user has no teams", async () => {
    const user = await UserService.create({ username: "lonely", teams: [] });
    const request = new Request("http://localhost/");
    expect(await resolveActiveTeam(request, user)).toBe(null);
  });

  it("returns the cookie team id when it is one of the user's teams", async () => {
    const teamA = await TeamService.create({ name: "A" });
    const teamB = await TeamService.create({ name: "B" });
    const user = await UserService.create({
      username: "u",
      teams: [
        { team: teamA._id, role: "ADMIN" },
        { team: teamB._id, role: "ADMIN" },
      ],
    });
    expect(await resolveActiveTeam(withCookie(teamB._id), user)).toBe(
      teamB._id,
    );
  });

  it("falls back to the user's personal team when no cookie", async () => {
    const personal = await TeamService.create({
      name: "personal",
      isPersonal: true,
    });
    const teamB = await TeamService.create({ name: "B" });
    const user = await UserService.create({
      username: "u",
      teams: [
        { team: teamB._id, role: "ADMIN" },
        { team: personal._id, role: "ADMIN" },
      ],
    });
    const request = new Request("http://localhost/");
    expect(await resolveActiveTeam(request, user)).toBe(personal._id);
  });

  it("falls back to the first team when no personal team exists", async () => {
    const teamA = await TeamService.create({ name: "A" });
    const teamB = await TeamService.create({ name: "B" });
    const user = await UserService.create({
      username: "u",
      teams: [
        { team: teamA._id, role: "ADMIN" },
        { team: teamB._id, role: "ADMIN" },
      ],
    });
    const request = new Request("http://localhost/");
    expect(await resolveActiveTeam(request, user)).toBe(teamA._id);
  });

  it("ignores a cookie team id the user does not belong to", async () => {
    const teamA = await TeamService.create({ name: "A" });
    const otherTeam = await TeamService.create({ name: "other" });
    const user = await UserService.create({
      username: "u",
      teams: [{ team: teamA._id, role: "ADMIN" }],
    });
    expect(await resolveActiveTeam(withCookie(otherTeam._id), user)).toBe(
      teamA._id,
    );
  });
});
