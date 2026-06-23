import type { Request, Response, NextFunction } from "express";
import { getSession, type SessionUser } from "../lib/auth-session";

declare global {
  namespace Express {
    interface Request {
      session?: SessionUser | null;
    }
  }
}

export async function optionalSession(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    req.session = await getSession(req);
    next();
  } catch (error) {
    next(error);
  }
}
