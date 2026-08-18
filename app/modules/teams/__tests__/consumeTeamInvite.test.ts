import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserService } from "~/modules/users/user";
import clearDocumentDB from "../../../../test/helpers/clearDocumentDB";
import consumeTeamInvite from "../services/consumeTeamInvite.server";
import { TeamService } from "../team";
import { TeamInviteService } from "../teamInvites";

vi.mock("~/modules/analytics/helpers/trackServerEvent.server", () => ({
  default: vi.fn(),
}));

async function expireInvite(inviteId: string) {
  await mongoose
    .model("TeamInvite")
    .updateOne(
      { _id: inviteId },
      { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    );
}

describe("consumeTeamInvite", () => {
  let team: Awaited<ReturnType<typeof TeamService.create>>;
  let admin: Awaited<ReturnType<typeof UserService.create>>;
  let invite: Awaited<ReturnType<typeof TeamInviteService.create>>;

  beforeEach(async () => {
    await clearDocumentDB();
    vi.clearAllMocks();
    team = await TeamService.create({ name: "Test Team" });
    admin = await UserService.create({ username: "admin", teams: [] });
    invite = await TeamInviteService.create({
      team: team._id,
      name: "Test Invite",
      maxUses: 10,
      createdBy: admin._id,
    });
  });

  async function makeUser(overrides: Record<string, unknown> = {}) {
    return UserService.create({
      username: "member",
      name: "Member",
      email: "member@example.com",
      githubId: 99,
      hasGithubSSO: true,
      isRegistered: true,
      teams: [],
      ...overrides,
    });
  }

  it("adds the team to an authenticated user who is not yet a member", async () => {
    const user = await makeUser();

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("success");
    const joined = result.user!.teams.find((t) => t.team === team._id);
    expect(joined).toBeDefined();
    expect(joined!.role).toBe("MEMBER");
    expect(joined!.viaTeamInvite).toBe(invite._id);

    const updatedInvite = await TeamInviteService.findById(invite._id);
    expect(updatedInvite?.usedCount).toBe(1);
  });

  it("keeps any teams the user already had", async () => {
    const other = await TeamService.create({ name: "Personal" });
    const user = await makeUser({
      teams: [{ team: other._id, role: "ADMIN" }],
    });

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("success");
    expect(result.user!.teams).toHaveLength(2);
  });

  it("reports already_member without spending a use", async () => {
    const user = await makeUser({
      teams: [{ team: team._id, role: "MEMBER" }],
    });

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("already_member");
    const updatedInvite = await TeamInviteService.findById(invite._id);
    expect(updatedInvite?.usedCount).toBe(0);
  });

  it("reports already_member even when the invite has expired", async () => {
    // The heart of #2461: an existing member must never be blocked by the age
    // of the link that first brought them in.
    const user = await makeUser({
      teams: [{ team: team._id, role: "MEMBER" }],
    });
    await expireInvite(invite._id);

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("already_member");
  });

  it("reports expired for a non-member when the invite is past its TTL", async () => {
    const user = await makeUser();
    await expireInvite(invite._id);

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("expired");
    expect(result.user).toBeUndefined();
  });

  it("reports revoked for a non-member when the invite is revoked", async () => {
    const user = await makeUser();
    await mongoose
      .model("TeamInvite")
      .updateOne({ _id: invite._id }, { revokedAt: new Date() });

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("revoked");
  });

  it("reports full for a non-member when the invite is at capacity", async () => {
    const user = await makeUser();
    await mongoose
      .model("TeamInvite")
      .updateOne({ _id: invite._id }, { usedCount: 10 });

    const result = await consumeTeamInvite({ inviteId: invite._id, user });

    expect(result.status).toBe("full");
  });

  it("reports not_found for an invite id that does not exist", async () => {
    const user = await makeUser();

    const result = await consumeTeamInvite({
      inviteId: new mongoose.Types.ObjectId().toString(),
      user,
    });

    expect(result.status).toBe("not_found");
  });

  it("does not create users", async () => {
    const user = await makeUser();
    const before = await UserService.find({ match: {} });

    await consumeTeamInvite({ inviteId: invite._id, user });

    const after = await UserService.find({ match: {} });
    expect(after).toHaveLength(before.length);
  });
});
