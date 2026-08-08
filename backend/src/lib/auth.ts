import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { CookieOptions } from "express";
import { env } from "./env";

export const USER_COOKIE = "astro_user_session";
export const ADMIN_COOKIE = "astro_admin_session";

// httpOnly so client-side JS (and therefore XSS) can never read the token;
// SameSite=None + Secure because the frontend and backend live on different
// Netlify subdomains, which browsers treat as different sites for cookie
// purposes - cross-site delivery requires both. Secure is only valid over
// HTTPS, so this is driven off CORS_ORIGIN (which is always the real
// deployed https:// frontend URL in production) rather than NODE_ENV, which
// serverless function runtimes don't reliably set. Local dev over
// http://localhost falls back automatically.
function cookieOptions(maxAgeMs: number): CookieOptions {
  const crossSite = env.corsOrigin.startsWith("https://");
  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    maxAge: maxAgeMs,
    path: "/",
  };
}

export const userCookieOptions = () => cookieOptions(7 * 24 * 60 * 60 * 1000); // 7d, matches signUserToken expiry
export const adminCookieOptions = () => cookieOptions(12 * 60 * 60 * 1000); // 12h, matches signAdminToken expiry

export interface UserTokenPayload {
  sub: string;
  email: string;
  role: "user";
}

export interface AdminTokenPayload {
  sub: string;
  username: string;
  role: "admin";
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signUserToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.jwtUserSecret, { expiresIn: "7d" });
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, env.jwtAdminSecret, { expiresIn: "12h" });
}

export function verifyUserToken(token: string): UserTokenPayload {
  return jwt.verify(token, env.jwtUserSecret) as UserTokenPayload;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, env.jwtAdminSecret) as AdminTokenPayload;
}
