import type { RequestHandler } from "express";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../sessionStorage";

export const setUser: RequestHandler = async (req, _res, next) => {
  const session = await sessionStorage.getSession(req.headers.cookie);
  const sessionUser = session.get("user");
  const user = sessionUser ? await UserService.findById(sessionUser._id) : null;

  if (user) req.user = user;
  next();
};

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({
      error: { message: "Authentication required", statusCode: 401 },
    });
    return;
  }

  next();
};
