import { beforeEach, describe, expect, it } from "vitest";
import { TeamService } from "~/modules/teams/team";
import { TeamInviteService } from "~/modules/teams/teamInvites";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import handleTeamInviteSignup from "../helpers/handleTeamInviteSignup.server";

async function captureThrow(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
  throw new Error("Expected handler to throw a Response, but it resolved");
}

describe("handleTeamInviteSignup already_member", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("logs the user in, flashes a toast, and redirects to /", async () => {
    const team = await TeamService.create({ name: "Existing Team" });
    const existing = await UserService.create({
      username: "existing",
      githubId: 42,
      hasGithubSSO: true,
      isRegistered: true,
      teams: [{ team: team._id, role: "MEMBER" }],
    });
    const invite = await TeamInviteService.create({
      team: team._id,
      name: "Test Invite",
      maxUses: 5,
      createdBy: existing._id,
    });

    const request = new Request("http://localhost/auth/github", {
      headers: { cookie: "" },
    });

    const response = await captureThrow(
      handleTeamInviteSignup({
        teamInviteId: invite._id,
        githubUser: { id: 42, login: "existing", name: "Existing" },
        emails: [{ primary: true, email: "existing@example.com" }],
        request,
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    // Session cookie name is configured in sessionStorage — check that the
    // Set-Cookie header was written (the specific name is an implementation
    // detail that could change).
    expect(setCookie).toMatch(/=.+/);
  });
});

describe("handleTeamInviteSignup with no usable email", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to NO_EMAIL and does not create a user when GitHub returns an error object", async () => {
    const team = await TeamService.create({ name: "Invite Team" });
    const inviter = await UserService.create({
      username: "inviter",
      email: "inviter@example.com",
      githubId: 99,
      hasGithubSSO: true,
      isRegistered: true,
      teams: [{ team: team._id, role: "ADMIN" }],
    });
    const invite = await TeamInviteService.create({
      team: team._id,
      name: "Test Invite",
      maxUses: 5,
      createdBy: inviter._id,
    });

    const request = new Request("http://localhost/auth/github", {
      headers: { cookie: "" },
    });

    const response = await captureThrow(
      handleTeamInviteSignup({
        teamInviteId: invite._id,
        githubUser: { id: 1234, login: "newcomer", name: "Newcomer" },
        // GitHub /user/emails can return an error object instead of an array
        emails: {
          message: "Bad credentials",
          documentation_url: "https://docs.github.com",
        } as never,
        request,
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/signup?error=NO_EMAIL");

    const created = await UserService.findOne({ githubId: 1234 });
    expect(created).toBeNull();
  });
});
