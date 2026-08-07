import { Request, Response, NextFunction } from "express";
import { verifyAdminToken, verifyUserToken, AdminTokenPayload, UserTokenPayload } from "../lib/auth";

export interface AuthedRequest extends Request {
  user?: UserTokenPayload;
  admin?: AdminTokenPayload;
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length);
}

export function requireUser(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    req.user = verifyUserToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalUser(req: AuthedRequest, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
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
  const token = extractBearer(req);
  if (!token) return res.status(401).json({ error: "Missing admin token" });
  try {
    req.admin = verifyAdminToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
