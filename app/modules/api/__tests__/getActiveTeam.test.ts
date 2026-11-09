import type { Request } from "express";
import { describe, expect, it } from "vitest";
import getActiveTeam from "../helpers/getActiveTeam";

const TEAM_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TEAM_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER_TEAM = "cccccccccccccccccccccccc";

function makeReq({
  teams,
  teamId,
  activeTeam,
}: {
  teams?: string[];
  teamId?: string;
  activeTeam?: string;
}): Request {
  const user = teams ? { teams: teams.map((team) => ({ team })) } : undefined;
  return { user, query: { teamId }, activeTeam } as unknown as Request;
}

describe("getActiveTeam", () => {
  it("returns null when there is no user", () => {
    expect(getActiveTeam(makeReq({ teamId: TEAM_A }))).toBeNull();
  });

  it("returns the requested team when the user belongs to it", () => {
    const req = makeReq({ teams: [TEAM_A, TEAM_B], teamId: TEAM_B });
    expect(getActiveTeam(req)).toBe(TEAM_B);
  });

  it("returns null when the user does not belong to the requested team", () => {
    const req = makeReq({ teams: [TEAM_A, TEAM_B], teamId: OTHER_TEAM });
    expect(getActiveTeam(req)).toBeNull();
  });

  it("returns null when the request has no team", () => {
    expect(getActiveTeam(makeReq({ teams: [TEAM_A, TEAM_B] }))).toBeNull();
  });

  it("returns the API key's team when set", () => {
    const req = makeReq({ teams: [TEAM_A], activeTeam: TEAM_A });
    expect(getActiveTeam(req)).toBe(TEAM_A);
  });

  it("prefers the API key's team over the teamId query param", () => {
    const req = makeReq({
      teams: [TEAM_A, TEAM_B],
      teamId: TEAM_B,
      activeTeam: TEAM_A,
    });
    expect(getActiveTeam(req)).toBe(TEAM_A);
  });

  it("ignores the active team cookie", () => {
    const req = {
      user: { teams: [{ team: TEAM_A }] },
      query: {},
      headers: { cookie: `sandpiper.activeTeamId=${TEAM_A}` },
    } as unknown as Request;
    expect(getActiveTeam(req)).toBeNull();
  });
});
