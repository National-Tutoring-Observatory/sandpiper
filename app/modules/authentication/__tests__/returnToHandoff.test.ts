import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import loginUser from "../../../../test/helpers/loginUser";

vi.mock("~/modules/analytics/helpers/trackServerEvent.server", () => ({
  default: vi.fn(),
}));

const authenticate = vi.fn();
vi.mock("../authentication.server", () => ({
  authenticator: {
    authenticate: (...args: unknown[]) => authenticate(...args),
  },
}));

async function cookieWithFlash(key: string, value: string): Promise<string> {
  const session = await sessionStorage.getSession();
  session.flash(key, value);
  const setCookie = await sessionStorage.commitSession(session);
  return setCookie.split(";")[0];
}

async function readSession(setCookie: string) {
  return sessionStorage.getSession(setCookie.split(";")[0]);
}

async function readActionBody(result: unknown): Promise<any> {
  if (result && typeof (result as Response).json === "function") {
    return await (result as Response).json();
  }
  return (result as { data: unknown }).data;
}

describe("returnTo survives onboarding", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
  });

  it("keeps returnTo in the session when the callback diverts a new user to onboarding", async () => {
    const user = await UserService.create({
      username: "newbie",
      githubId: 1,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: false,
      teams: [],
    });
    authenticate.mockResolvedValue(user);

    const { loader } = await import("../containers/authCallback.route");

    const request = new Request("http://localhost/auth/callback/github", {
      headers: { cookie: await cookieWithFlash("returnTo", "/join/abc123") },
    });

    const response = (await loader({
      request,
      params: { provider: "github" },
    } as never)) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/onboarding");

    const session = await readSession(response.headers.get("Set-Cookie")!);
    expect(session.get("returnTo")).toBe("/join/abc123");
  });

  it("redirects to returnTo instead of / when onboarding completes", async () => {
    const user = await UserService.create({
      username: "finishing",
      githubId: 2,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: false,
      termsAcceptedAt: new Date(),
      teams: [],
    });

    const cookie = await loginUser(user._id);
    const session = await sessionStorage.getSession(cookie);
    session.flash("returnTo", "/join/abc123");
    const cookieHeader = (await sessionStorage.commitSession(session)).split(
      ";",
    )[0];

    const { action } = await import("../containers/onboarding.route");

    const request = new Request("http://localhost/onboarding", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "COMPLETE_ONBOARDING",
        payload: {
          institution: "Cornell University",
          userRole: "Researcher",
          useCases: ["Educational research"],
          scholarshipInterest: false,
        },
      }),
    });

    const result = await action({ request, params: {} } as never);
    const body = await readActionBody(result);

    expect(body.data.redirectTo).toBe("/join/abc123");
  });

  it("still redirects to / when onboarding completes with no returnTo", async () => {
    const user = await UserService.create({
      username: "plain",
      githubId: 3,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: false,
      termsAcceptedAt: new Date(),
      teams: [],
    });

    const cookieHeader = await loginUser(user._id);

    const { action } = await import("../containers/onboarding.route");

    const request = new Request("http://localhost/onboarding", {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify({
        intent: "COMPLETE_ONBOARDING",
        payload: {
          institution: "National Tutoring Observatory",
          userRole: "Researcher",
          useCases: ["Educational research"],
          scholarshipInterest: false,
        },
      }),
    });

    const result = await action({ request, params: {} } as never);
    const body = await readActionBody(result);

    expect(body.data.redirectTo).toBe("/");
  });
});
