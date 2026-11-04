import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { User } from "~/modules/users/users.types";
import { isTeamAdmin } from "../teams.middleware";

function makeReqRes(user?: Partial<User>, teamId?: string) {
  const req = { user, query: { teamId } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

function expect403(res: Response, next: NextFunction) {
  expect(next).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({
    error: { message: "Team admin required", statusCode: 403 },
  });
}

describe("isTeamAdmin", () => {
  it("returns 403 when there is no user", () => {
    const { req, res, next } = makeReqRes();
    isTeamAdmin(req, res, next);
    expect403(res, next);
  });

  it("returns 403 when the user has no teams", () => {
    const { req, res, next } = makeReqRes({ teams: [] });
    isTeamAdmin(req, res, next);
    expect403(res, next);
  });

  it("returns 403 when the user is a member of the requested team", () => {
    const { req, res, next } = makeReqRes(
      { teams: [{ team: "team1", role: "MEMBER" }] } as Partial<User>,
      "team1",
    );
    isTeamAdmin(req, res, next);
    expect403(res, next);
  });

  it("returns 403 when the user is admin of a different team than the requested one", () => {
    const { req, res, next } = makeReqRes(
      {
        teams: [
          { team: "team1", role: "ADMIN" },
          { team: "team2", role: "MEMBER" },
        ],
      } as Partial<User>,
      "team2",
    );
    isTeamAdmin(req, res, next);
    expect403(res, next);
  });

  it("calls next when the user is admin of the requested team", () => {
    const { req, res, next } = makeReqRes(
      {
        teams: [
          { team: "team1", role: "MEMBER" },
          { team: "team2", role: "ADMIN" },
        ],
      } as Partial<User>,
      "team2",
    );
    isTeamAdmin(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
