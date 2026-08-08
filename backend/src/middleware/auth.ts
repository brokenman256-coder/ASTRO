import { Request, Response, NextFunction } from "express";
import {
  verifyAdminToken,
  verifyUserToken,
  AdminTokenPayload,
  UserTokenPayload,
  USER_COOKIE,
  ADMIN_COOKIE,
} from "../lib/auth";

export interface AuthedRequest extends Request {
  user?: UserTokenPayload;
  admin?: AdminTokenPayload;
}

// Cookie is the primary session mechanism (httpOnly, so client JS can never
// read the token); the Authorization header is kept as a fallback so the
// API still works for non-browser callers (scripts, tests) that can't rely
// on cookie jars.
function extractUserToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[USER_COOKIE];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return null;
}

function extractAdminToken(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[ADMIN_COOKIE];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return null;
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractUserToken(req);
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    req.user = verifyUserToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractUserToken(req);
  if (token) {
    try {
      req.user = verifyUserToken(token);
    } catch {
      // ignore - treated as guest
    }
  }
  next();
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractAdminToken(req);
  if (!token) return res.status(401).json({ error: "Missing admin token" });
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
