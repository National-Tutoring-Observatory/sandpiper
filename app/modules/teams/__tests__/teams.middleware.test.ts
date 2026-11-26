import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";
import { describe, expect, it, vi } from "vitest";
import type { User } from "~/modules/users/users.types";
import { isTeamMember } from "../teams.middleware";

const teamId = new Types.ObjectId().toString();

function makeReqRes(user: User | undefined, queryTeamId?: string) {
  const req = { user, query: { teamId: queryTeamId } } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

const member = { teams: [{ team: teamId, role: "MEMBER" }] } as User;

describe("isTeamMember", () => {
  it("calls next for a member of the requested team", () => {
    const { req, res, next } = makeReqRes(member, teamId);
    isTeamMember(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it.each([
    ["no user", undefined, teamId],
    ["no teamId", member, undefined],
    ["another team", member, new Types.ObjectId().toString()],
  ])("returns 403 with %s", (_name, user, queryTeamId) => {
    const { req, res, next } = makeReqRes(user, queryTeamId);
    isTeamMember(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
