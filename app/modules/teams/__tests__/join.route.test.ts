import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";
import { action, loader } from "../containers/join.route";
import { TeamService } from "../team";
import { TeamInviteService } from "../teamInvites";

vi.mock("~/modules/analytics/helpers/trackServerEvent.server", () => ({
  default: vi.fn(),
}));

async function captureThrow(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
  throw new Error("Expected handler to throw a Response, but it resolved");
}

async function readActionBody(result: unknown): Promise<any> {
  if (result && typeof (result as Response).json === "function") {
    return await (result as Response).json();
  }
  return (result as { data: unknown }).data;
}

async function expireInvite(inviteId: string) {
  await mongoose
    .model("TeamInvite")
    .updateOne(
      { _id: inviteId },
      { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    );
}

describe("join.route", () => {
  let team: Awaited<ReturnType<typeof TeamService.create>>;
  let admin: Awaited<ReturnType<typeof UserService.create>>;
  let invite: Awaited<ReturnType<typeof TeamInviteService.create>>;

  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
    team = await TeamService.create({ name: "Observatory Team" });
    admin = await UserService.create({ username: "admin", teams: [] });
    invite = await TeamInviteService.create({
      team: team._id,
      name: "Active",
      maxUses: 5,
      createdBy: admin._id,
    });
  });

  function getRequest(slug: string, cookie?: string) {
    return new Request(`http://localhost/join/${slug}`, {
      headers: cookie ? { cookie } : {},
    });
  }

  function postRequest(slug: string, cookie?: string) {
    return new Request(`http://localhost/join/${slug}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify({ intent: "JOIN_TEAM" }),
    });
  }

  async function makeMember(overrides: Record<string, unknown> = {}) {
    return UserService.create({
      username: "member",
      name: "Member",
      email: "member@example.com",
      githubId: 4242,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: true,
      teams: [],
      ...overrides,
    });
  }

  describe("loader, signed out", () => {
    it("returns the invite details for an active invite", async () => {
      const result = (await loader({
        request: getRequest(invite.slug),
        params: { slug: invite.slug },
      } as never)) as { isAuthenticated: boolean; slug: string };

      expect(result.isAuthenticated).toBe(false);
      expect(result.slug).toBe(invite.slug);
    });

    it("redirects to signup with EXPIRED_INVITE when the invite is expired", async () => {
      await expireInvite(invite._id);

      const response = await captureThrow(
        loader({
          request: getRequest(invite.slug),
          params: { slug: invite.slug },
        } as never),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        "/signup?error=EXPIRED_INVITE",
      );
    });

    it("redirects to signup with EXPIRED_INVITE when the invite does not exist", async () => {
      const response = await captureThrow(
        loader({
          request: getRequest("does-not-exist-12345678"),
          params: { slug: "does-not-exist-12345678" },
        } as never),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe(
        "/signup?error=EXPIRED_INVITE",
      );
    });
  });

  describe("loader, signed in", () => {
    it("offers the team to a signed-in non-member instead of sending them through GitHub", async () => {
      const user = await makeMember();
      const cookie = await loginUser(user._id);

      const result = (await loader({
        request: getRequest(invite.slug, cookie),
        params: { slug: invite.slug },
      } as never)) as {
        isAuthenticated: boolean;
        teamName: string;
        status: string;
      };

      expect(result.isAuthenticated).toBe(true);
      expect(result.teamName).toBe("Observatory Team");
      expect(result.status).toBe("active");
    });

    it("renders the expired state in place rather than bouncing to signup", async () => {
      const user = await makeMember();
      const cookie = await loginUser(user._id);
      await expireInvite(invite._id);

      const result = (await loader({
        request: getRequest(invite.slug, cookie),
        params: { slug: invite.slug },
      } as never)) as { isAuthenticated: boolean; status: string };

      expect(result.isAuthenticated).toBe(true);
      expect(result.status).toBe("expired");
    });

    it("reports already_member for a signed-in member, even on an expired invite", async () => {
      const user = await makeMember({
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      const cookie = await loginUser(user._id);
      await expireInvite(invite._id);

      const result = (await loader({
        request: getRequest(invite.slug, cookie),
        params: { slug: invite.slug },
      } as never)) as { status: string };

      expect(result.status).toBe("already_member");
    });
  });

  describe("action", () => {
    it("adds a signed-in non-member to the team and redirects home with a toast", async () => {
      const user = await makeMember();
      const cookie = await loginUser(user._id);

      const response = await captureThrow(
        action({
          request: postRequest(invite.slug, cookie),
          params: { slug: invite.slug },
        } as never),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/");

      const session = await sessionStorage.getSession(
        response.headers.get("Set-Cookie")!.split(";")[0],
      );
      expect(session.get("flashToast")).toContain("Observatory Team");

      const updated = await UserService.findById(user._id);
      expect(updated!.teams.some((t) => t.team === team._id)).toBe(true);
    });

    it("sends a signed-out visitor to sign in and remembers the invite page", async () => {
      const response = await captureThrow(
        action({
          request: postRequest(invite.slug),
          params: { slug: invite.slug },
        } as never),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/signup");

      const session = await sessionStorage.getSession(
        response.headers.get("Set-Cookie")!.split(";")[0],
      );
      expect(session.get("returnTo")).toBe(`/join/${invite.slug}`);
    });

    it("redirects an existing member home instead of erroring", async () => {
      const user = await makeMember({
        teams: [{ team: team._id, role: "MEMBER" }],
      });
      const cookie = await loginUser(user._id);
      await expireInvite(invite._id);

      const response = await captureThrow(
        action({
          request: postRequest(invite.slug, cookie),
          params: { slug: invite.slug },
        } as never),
      );

      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/");
    });

    it("refuses to add a non-member on an expired invite", async () => {
      const user = await makeMember();
      const cookie = await loginUser(user._id);
      await expireInvite(invite._id);

      const result = await action({
        request: postRequest(invite.slug, cookie),
        params: { slug: invite.slug },
      } as never);

      const body = await readActionBody(result);
      expect(body.error).toBe("expired");

      const updated = await UserService.findById(user._id);
      expect(updated!.teams.some((t) => t.team === team._id)).toBe(false);
    });

    it("refuses an invite slug that does not exist", async () => {
      const user = await makeMember();
      const cookie = await loginUser(user._id);

      const result = await action({
        request: postRequest("nope-12345678", cookie),
        params: { slug: "nope-12345678" },
      } as never);

      const body = await readActionBody(result);
      expect(body.error).toBe("not_found");
    });
  });
});
