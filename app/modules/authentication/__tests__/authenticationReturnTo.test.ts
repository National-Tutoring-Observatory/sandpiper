import { beforeEach, describe, expect, it, vi } from "vitest";
import sessionStorage from "../../../../sessionStorage";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";

const authenticate = vi.fn();
vi.mock("../authentication.server", () => ({
  authenticator: {
    authenticate: (...args: unknown[]) => authenticate(...args),
  },
}));

async function captureThrow(promise: Promise<unknown>): Promise<Response> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof Response) return err;
    throw err;
  }
  throw new Error("Expected action to throw a Response, but it resolved");
}

async function postSignIn(body: Record<string, unknown>) {
  const { action } = await import("../containers/authentication.route");
  const request = new Request("http://localhost/api/authentication", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return captureThrow(action({ request, params: {} } as never));
}

describe("/api/authentication returnTo", () => {
  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
    // remix-auth throws the provider redirect out of authenticate()
    authenticate.mockImplementation(() => {
      throw new Response(null, {
        status: 302,
        headers: { Location: "https://github.com/login/oauth/authorize" },
      });
    });
  });

  it("stores an explicit returnTo on the session so the callback can use it", async () => {
    const response = await postSignIn({
      provider: "github",
      returnTo: "/join/abc123",
    });

    const session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")!.split(";")[0],
    );
    expect(session.get("returnTo")).toBe("/join/abc123");
  });

  it("refuses an off-site returnTo", async () => {
    const response = await postSignIn({
      provider: "github",
      returnTo: "//evil.example.com/phish",
    });

    const session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")!.split(";")[0],
    );
    expect(session.get("returnTo")).toBeUndefined();
  });

  it("stores nothing when no returnTo is given", async () => {
    const response = await postSignIn({ provider: "github" });

    const session = await sessionStorage.getSession(
      response.headers.get("Set-Cookie")!.split(";")[0],
    );
    expect(session.get("returnTo")).toBeUndefined();
  });
});
