import { beforeEach, describe, expect, it } from "vitest";
import { BillingLedgerEntryService } from "~/modules/billing/billingLedgerEntry";
import { BillingPlanService } from "~/modules/billing/billingPlan";
import { TeamBillingPlanService } from "~/modules/billing/teamBillingPlan";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import expectAuthRequired from "../../../../test/helpers/expectAuthRequired";
import loginUser from "../../../../test/helpers/loginUser";
import { action } from "../containers/createTeam.route";
import { TeamService } from "../team";

function postCreateTeam(
  body: Record<string, unknown>,
  cookieHeader: string,
): Promise<Response> {
  return action({
    request: new Request("http://localhost/api/teams", {
      method: "POST",
      headers: { cookie: cookieHeader },
      body: JSON.stringify(body),
    }),
    params: {},
  } as never) as unknown as Promise<Response>;
}

describe("createTeam.route", () => {
  beforeEach(async () => {
    await clearDocumentDB();
  });

  it("redirects to / when there is no session cookie", async () => {
    await expectAuthRequired(() =>
      action({
        request: new Request("http://localhost/api/teams", {
          method: "POST",
          body: JSON.stringify({
            intent: "CREATE_TEAM",
            payload: { name: "x" },
          }),
        }),
        params: {},
      } as never),
    );
  });

  it("creates a team when user is super admin", async () => {
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "new team" } },
      cookieHeader,
    )) as unknown as {
      data: {
        success: boolean;
        intent: string;
        data: { _id: string; name: string };
      };
    };

    const result = response.data;

    expect(result.success).toBe(true);
    expect(result.intent).toBe("CREATE_TEAM");
    expect(result.data._id).toBeDefined();
    expect(result.data.name).toBe("new team");

    const retrieved = await TeamService.findById(result.data._id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe("new team");

    const updatedAdmin = await UserService.findById(admin._id);
    expect(
      updatedAdmin?.teams.some(
        (t) => t.team === result.data._id && t.role === "ADMIN",
      ),
    ).toBe(true);
  });

  it("sets the active team cookie on response", async () => {
    const user = await UserService.create({
      username: "u",
      role: "USER",
      teams: [],
    });
    const cookieHeader = await loginUser(user._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "team" } },
      cookieHeader,
    )) as unknown as {
      init: { headers: Record<string, string> };
      data: { data: { _id: string } };
    };

    const setCookie = response.init.headers["Set-Cookie"];
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("sandpiper.activeTeamId=");
    expect(setCookie).toContain(response.data.data._id);
  });

  it("assigns the default billing plan to the new team", async () => {
    await BillingPlanService.create({
      name: "Standard",
      markupRate: 1.5,
      isDefault: true,
    });

    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "new team" } },
      cookieHeader,
    )) as unknown as { data: { data: { _id: string } } };

    const teamId = response.data.data._id;
    const assignment = await TeamBillingPlanService.findByTeam(teamId);
    expect(assignment).toBeDefined();
  });

  it("does not assign credits to the new team", async () => {
    await BillingPlanService.create({
      name: "Standard",
      markupRate: 1.5,
      isDefault: true,
    });

    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "new team" } },
      cookieHeader,
    )) as unknown as { data: { data: { _id: string } } };

    const teamId = response.data.data._id;
    const ledgerEntries = await BillingLedgerEntryService.findByTeam(teamId);
    expect(ledgerEntries).toHaveLength(0);
  });

  it("creates a team without a plan if no default plan exists", async () => {
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "new team" } },
      cookieHeader,
    )) as unknown as { data: { success: boolean; data: { _id: string } } };

    expect(response.data.success).toBe(true);
    const teamId = response.data.data._id;
    const assignment = await TeamBillingPlanService.findByTeam(teamId);
    expect(assignment).toBeNull();
  });

  it("returns error when team name is missing", async () => {
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: {} },
      cookieHeader,
    )) as unknown as { data: { errors: { general: string } } };

    expect(response.data.errors).toBeDefined();
    expect(response.data.errors.general).toMatch(/Team name is required/);
  });

  it("rejects whitespace-only team names", async () => {
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "   " } },
      cookieHeader,
    )) as unknown as { data: { errors: { general: string } } };

    expect(response.data.errors).toBeDefined();
    expect(response.data.errors.general).toMatch(/Team name is required/);
  });

  it("trims surrounding whitespace from the persisted team name", async () => {
    const user = await UserService.create({
      username: "u",
      role: "USER",
      teams: [],
    });
    const cookieHeader = await loginUser(user._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "  Padded Team  " } },
      cookieHeader,
    )) as unknown as { data: { data: { _id: string; name: string } } };

    expect(response.data.data.name).toBe("Padded Team");
    const retrieved = await TeamService.findById(response.data.data._id);
    expect(retrieved?.name).toBe("Padded Team");
  });

  it("rejects unknown intents", async () => {
    const admin = await UserService.create({
      username: "admin",
      role: "SUPER_ADMIN",
    });

    const cookieHeader = await loginUser(admin._id);

    const response = (await postCreateTeam(
      { intent: "SOMETHING_ELSE", payload: { name: "x" } },
      cookieHeader,
    )) as unknown as { data: { errors: { general: string } } };

    expect(response.data.errors.general).toMatch(/Invalid intent/);
  });

  it("creates a team when user is a regular user", async () => {
    const user = await UserService.create({
      username: "user1",
      role: "USER",
      teams: [],
    });

    const cookieHeader = await loginUser(user._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "my team" } },
      cookieHeader,
    )) as unknown as { data: { success: boolean; data: { name: string } } };

    const result = response.data;

    expect(result.success).toBe(true);
    expect(result.data.name).toBe("my team");
  });

  it("adds the regular user as ADMIN of the newly created team", async () => {
    const user = await UserService.create({
      username: "user1",
      role: "USER",
      teams: [],
    });

    const cookieHeader = await loginUser(user._id);

    const response = (await postCreateTeam(
      { intent: "CREATE_TEAM", payload: { name: "my team" } },
      cookieHeader,
    )) as unknown as { data: { data: { _id: string } } };

    const teamId = response.data.data._id;
    const updated = await UserService.findById(user._id);
    expect(
      updated?.teams.some((t) => t.team === teamId && t.role === "ADMIN"),
    ).toBe(true);
  });
});
