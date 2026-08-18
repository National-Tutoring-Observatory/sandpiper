import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../../sessionStorage";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";

vi.mock("~/modules/analytics/helpers/trackServerEvent.server", () => ({
  default: vi.fn(),
}));

const authenticate = vi.fn();
vi.mock("../authentication.server", () => ({
  authenticator: {
    authenticate: (...args: unknown[]) => authenticate(...args),
  },
}));

describe("authCallback clears invite carriers from the committed cookie", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
  });

  async function signInWith(flashes: Record<string, string>) {
    const user = await UserService.create({
      username: "returning",
      githubId: 1234,
      hasGithubSSO: true,
      isRegistered: true,
      onboardingComplete: true,
      teams: [],
    });
    authenticate.mockResolvedValue(user);

    const session = await sessionStorage.getSession();
    for (const [key, value] of Object.entries(flashes)) {
      session.flash(key, value);
    }
    const cookie = (await sessionStorage.commitSession(session)).split(";")[0];

    const { loader } = await import("../containers/authCallback.route");
    const response = (await loader({
      request: new Request("http://localhost/auth/callback/github", {
        headers: { cookie },
      }),
      params: { provider: "github" },
    } as never)) as Response;

    return sessionStorage.getSession(
      response.headers.get("Set-Cookie")!.split(";")[0],
    );
  }

  it("drops a legacy inviteId so it cannot poison the next sign-in", async () => {
    const session = await signInWith({ inviteId: "some-invite" });
    expect(session.get("inviteId")).toBeUndefined();
  });

  it("drops a teamInviteId left over from a cookie issued before this fix", async () => {
    const session = await signInWith({ teamInviteId: "some-team-invite" });
    expect(session.get("teamInviteId")).toBeUndefined();
  });
});
