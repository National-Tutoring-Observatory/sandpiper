import type { RequestHandler } from "express";
import { UserService } from "~/modules/users/user";
import sessionStorage from "../../../sessionStorage";

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const session = await sessionStorage.getSession(req.headers.cookie);
  const sessionUser = session.get("user");
  const user = sessionUser ? await UserService.findById(sessionUser._id) : null;

  if (!user) {
    res.status(401).json({
      error: { message: "Authentication required", statusCode: 401 },
    });
    return;
  }

  req.user = user;
  next();
};
