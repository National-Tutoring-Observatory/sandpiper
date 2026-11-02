import type { Request } from "express";
import { describe, expect, it } from "vitest";
import getActiveTeam from "../helpers/getActiveTeam";

const TEAM_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
const TEAM_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
const OTHER_TEAM = "cccccccccccccccccccccccc";

function makeReq({
  teams,
  cookie,
}: {
  teams?: string[];
  cookie?: string;
}): Request {
  const user = teams ? { teams: teams.map((team) => ({ team })) } : undefined;
  return { user, headers: { cookie } } as unknown as Request;
}

describe("getActiveTeam", () => {
  it("returns null when there is no user", () => {
    expect(getActiveTeam(makeReq({}))).toBeNull();
  });

  it("returns null when the user has no teams", () => {
    expect(getActiveTeam(makeReq({ teams: [] }))).toBeNull();
  });

  it("returns the cookie team when the user belongs to it", () => {
    const req = makeReq({
      teams: [TEAM_A, TEAM_B],
      cookie: `foo=bar; sandpiper.activeTeamId=${TEAM_B}`,
    });
    expect(getActiveTeam(req)).toBe(TEAM_B);
  });

  it("falls back to the first team when the user does not belong to the cookie team", () => {
    const req = makeReq({
      teams: [TEAM_A, TEAM_B],
      cookie: `sandpiper.activeTeamId=${OTHER_TEAM}`,
    });
    expect(getActiveTeam(req)).toBe(TEAM_A);
  });

  it("falls back to the first team when there is no cookie", () => {
    expect(getActiveTeam(makeReq({ teams: [TEAM_A, TEAM_B] }))).toBe(TEAM_A);
  });

  it("falls back to the first team when the cookie has no active team", () => {
    const req = makeReq({ teams: [TEAM_A, TEAM_B], cookie: "foo=bar" });
    expect(getActiveTeam(req)).toBe(TEAM_A);
  });
});
