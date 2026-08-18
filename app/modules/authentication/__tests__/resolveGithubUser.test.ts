import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { TeamInviteService } from "~/modules/teams/teamInvites";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import resolveGithubUser from "../helpers/resolveGithubUser.server";

vi.mock("~/modules/analytics/helpers/trackServerEvent.server", () => ({
  default: vi.fn(),
}));

async function cookieWithFlash(key: string, value: string): Promise<string> {
  const session = await sessionStorage.getSession();
  session.flash(key, value);
  const setCookie = await sessionStorage.commitSession(session);
  return setCookie.split(";")[0];
}

async function expireInvite(inviteId: string) {
  await mongoose
    .model("TeamInvite")
    .updateOne(
      { _id: inviteId },
      { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    );
}

describe("resolveGithubUser — issue #2461", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
  });

  it("signs in an existing user whose cookie still carries a stale, expired team invite", async () => {
    const team = await TeamService.create({ name: "Aly's Team" });
    const existing = await UserService.create({
      username: "aly",
      name: "Aly",
      email: "aly@example.com",
      githubId: 4242,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: true,
      teams: [{ team: team._id, role: "MEMBER" }],
    });

    // She joined via this link months ago; it has long since expired, but the
    // invite id was never cleared from her session cookie.
    const invite = await TeamInviteService.create({
      team: team._id,
      name: "Old Link",
      maxUses: 100,
      createdBy: existing._id,
    });
    await expireInvite(invite._id);

    const request = new Request("http://localhost/auth/callback/github", {
      headers: { cookie: await cookieWithFlash("teamInviteId", invite._id) },
    });

    const user = await resolveGithubUser({
      githubUser: { id: 4242, login: "aly", name: "Aly" },
      emails: [{ primary: true, verified: true, email: "aly@example.com" }],
      request,
    });

    expect(user).toBeTruthy();
    expect(user._id).toBe(existing._id);
  });

  it("signs in an existing user whose cookie carries a stale team invite that no longer exists", async () => {
    const team = await TeamService.create({ name: "Ghost Team" });
    const existing = await UserService.create({
      username: "ghost",
      name: "Ghost",
      email: "ghost@example.com",
      githubId: 777,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: true,
      teams: [{ team: team._id, role: "MEMBER" }],
    });

    const request = new Request("http://localhost/auth/callback/github", {
      headers: {
        cookie: await cookieWithFlash(
          "teamInviteId",
          new mongoose.Types.ObjectId().toString(),
        ),
      },
    });

    const user = await resolveGithubUser({
      githubUser: { id: 777, login: "ghost", name: "Ghost" },
      emails: [{ primary: true, verified: true, email: "ghost@example.com" }],
      request,
    });

    expect(user._id).toBe(existing._id);
  });

  it("still claims a placeholder account for a genuinely invited new user", async () => {
    const team = await TeamService.create({ name: "Invited Team" });
    const placeholder = await UserService.create({
      name: "Invitee",
      isRegistered: false,
      inviteId: "live-invite-id",
      invitedAt: new Date(),
      teams: [{ team: team._id, role: "MEMBER" }],
      githubId: 0,
      hasGithubSSO: false,
    });

    const request = new Request("http://localhost/auth/callback/github", {
      headers: { cookie: await cookieWithFlash("inviteId", "live-invite-id") },
    });

    const user = await resolveGithubUser({
      githubUser: { id: 31337, login: "invitee", name: "Invitee" },
      emails: [{ primary: true, verified: true, email: "invitee@example.com" }],
      request,
    });

    expect(user._id).toBe(placeholder._id);
    expect(user.isRegistered).toBe(true);
    expect(user.githubId).toBe(31337);
  });

  it("still refuses a brand-new user arriving on an expired legacy invite", async () => {
    const team = await TeamService.create({ name: "Stale Team" });
    await UserService.create({
      name: "Latecomer",
      isRegistered: false,
      inviteId: "old-invite-id",
      invitedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      teams: [{ team: team._id, role: "MEMBER" }],
      githubId: 0,
      hasGithubSSO: false,
    });

    const request = new Request("http://localhost/auth/callback/github", {
      headers: { cookie: await cookieWithFlash("inviteId", "old-invite-id") },
    });

    let thrown: unknown;
    try {
      await resolveGithubUser({
        githubUser: { id: 8888, login: "late", name: "Late" },
        emails: [{ primary: true, verified: true, email: "late@example.com" }],
        request,
      });
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("location")).toBe(
      "/signup?error=EXPIRED_INVITE",
    );
  });

  it("signs in an existing user whose cookie carries a stale legacy invite id", async () => {
    const team = await TeamService.create({ name: "Legacy Team" });
    const existing = await UserService.create({
      username: "legacy",
      name: "Legacy",
      email: "legacy@example.com",
      githubId: 555,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: true,
      teams: [{ team: team._id, role: "MEMBER" }],
    });

    const request = new Request("http://localhost/auth/callback/github", {
      headers: { cookie: await cookieWithFlash("inviteId", "dead-invite-id") },
    });

    const user = await resolveGithubUser({
      githubUser: { id: 555, login: "legacy", name: "Legacy" },
      emails: [{ primary: true, verified: true, email: "legacy@example.com" }],
      request,
    });

    expect(user._id).toBe(existing._id);
  });
});
