import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import {
  hashPassword,
  verifyPassword,
  signUserToken,
  signAdminToken,
  USER_COOKIE,
  ADMIN_COOKIE,
  userCookieOptions,
  adminCookieOptions,
} from "../lib/auth";
import { requireAdmin, requireUser, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

function publicUser(user: { id: string; name: string; email: string; phone: string | null; dob: Date | null }) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, dob: user.dob };
}

// ---------- User auth ----------

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  phone: z.string().min(7).max(20),
  dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password, phone, dob } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, dob: new Date(dob) },
  });
  const token = signUserToken({ sub: user.id, email: user.email, role: "user" });
  res.cookie(USER_COOKIE, token, userCookieOptions());
  res.status(201).json({ user: publicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  const token = signUserToken({ sub: user.id, email: user.email, role: "user" });
  res.cookie(USER_COOKIE, token, userCookieOptions());
  res.json({ user: publicUser(user) });
});

authRouter.get("/me", requireUser, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(USER_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// ---------- Secret admin passage ----------
// Step 1: caller must know the out-of-band ADMIN_ACCESS_PHRASE (never sent to
// the client bundle, only checked server-side). Correct phrase issues a very
// short-lived "gateway" token.
// Step 2: the gateway token + real admin username/password log the admin in.
// This means finding the hidden UI route alone is not enough to reach the
// admin login form, and knowing the login form alone is not enough either.

const gatewayLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8 });
const adminLoginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 8 });

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const gatewaySchema = z.object({ passphrase: z.string().min(1) });

authRouter.post("/admin/gateway", gatewayLimiter, (req, res) => {
  const parsed = gatewaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Passphrase required" });
  if (!env.adminAccessPhrase) {
    return res.status(503).json({ error: "Admin passage is not configured on this server" });
  }
  if (!timingSafeEqual(parsed.data.passphrase, env.adminAccessPhrase)) {
    return res.status(401).json({ error: "Access denied" });
  }
  const gatewayToken = jwt.sign({ purpose: "admin-gateway" }, env.jwtAdminSecret, {
    expiresIn: "5m",
  });
  res.json({ gatewayToken });
});

const adminLoginSchema = z.object({
  gatewayToken: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/admin/login", adminLoginLimiter, async (req, res) => {
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Missing fields" });
  const { gatewayToken, username, password } = parsed.data;

  try {
    const decoded = jwt.verify(gatewayToken, env.jwtAdminSecret) as { purpose?: string };
    if (decoded.purpose !== "admin-gateway") throw new Error("bad token");
  } catch {
    return res.status(401).json({ error: "Gateway session expired, re-enter the passphrase" });
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return res.status(401).json({ error: "Invalid admin credentials" });
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid admin credentials" });

  const token = signAdminToken({ sub: admin.id, username: admin.username, role: "admin" });
  res.cookie(ADMIN_COOKIE, token, adminCookieOptions());
  res.json({ admin: { id: admin.id, username: admin.username } });
});

authRouter.get("/admin/me", requireAdmin, async (req: AuthedRequest, res) => {
  const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  res.json({ admin: { id: admin.id, username: admin.username } });
});

authRouter.post("/admin/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE, { path: "/" });
  res.json({ ok: true });
});

// Self-service credential change: requires a valid admin session AND the
// current password, so a stolen JWT alone can't lock the real admin out.
const changeCredentialsSchema = z.object({
  currentPassword: z.string().min(1),
  newUsername: z.string().min(3).max(100).optional(),
  newPassword: z.string().min(8).max(200).optional(),
});

authRouter.put("/admin/credentials", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = changeCredentialsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { currentPassword, newUsername, newPassword } = parsed.data;
  if (!newUsername && !newPassword) {
    return res.status(400).json({ error: "Provide a new username and/or password" });
  }

  const admin = await prisma.admin.findUnique({ where: { id: req.admin!.sub } });
  if (!admin) return res.status(404).json({ error: "Admin not found" });
  const ok = await verifyPassword(currentPassword, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  if (newUsername && newUsername !== admin.username) {
    const clash = await prisma.admin.findUnique({ where: { username: newUsername } });
    if (clash) return res.status(409).json({ error: "That username is already taken" });
  }

  const data: { username?: string; passwordHash?: string } = {};
  if (newUsername) data.username = newUsername;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  const updated = await prisma.admin.update({ where: { id: admin.id }, data });
  res.json({ admin: { id: updated.id, username: updated.username } });
});
