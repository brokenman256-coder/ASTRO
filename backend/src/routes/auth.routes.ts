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
import { ZODIAC_DATA } from "../lib/zodiac";

export const authRouter = Router();

const ZODIAC_NAMES = ZODIAC_DATA.map((z) => z.name) as [string, ...string[]];

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dob: Date | null;
  zodiacSign: string | null;
}) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, dob: user.dob, zodiacSign: user.zodiacSign };
}

// ---------- User auth ----------

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(200),
  phone: z.string().min(7).max(20),
  dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
  zodiacSign: z.enum(ZODIAC_NAMES),
});

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password, phone, dob, zodiacSign } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, phone, dob: new Date(dob), zodiacSign },
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

// ---------- Forgot password (OTP) ----------
// No email/SMS provider is configured (same honesty as the wallet top-up
// QR flow), so the OTP is issued and surfaced in the admin panel for a
// human to relay to the user, rather than silently pretending a real
// delivery channel exists. The public response is always the same generic
// message regardless of whether the email exists, so this can't be used to
// enumerate accounts.

const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5 });
const resetPasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10 });

function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

const forgotPasswordSchema = z.object({ email: z.string().email() });
const GENERIC_FORGOT_MESSAGE =
  "If an account exists for this email, an OTP request has been submitted - our team will reach out with your code shortly.";

authRouter.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "A valid email is required" });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    await prisma.passwordResetRequest.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true }, // invalidate any earlier still-pending OTPs
    });
    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        otp: generateOtp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });
  }

  res.json({ message: GENERIC_FORGOT_MESSAGE });
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
  newPassword: z.string().min(6).max(200),
});

authRouter.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Missing or invalid fields" });
  const { email, otp, newPassword } = parsed.data;

  const request = await prisma.passwordResetRequest.findFirst({
    where: { email, otp, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!request) return res.status(400).json({ error: "Invalid or expired OTP" });

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: request.userId }, data: { passwordHash } }),
    prisma.passwordResetRequest.update({ where: { id: request.id }, data: { used: true } }),
  ]);

  res.json({ message: "Password updated - you can log in with your new password now." });
});

// ---- Admin: view OTP requests so they can be relayed to the user ----
authRouter.get("/admin/password-resets", requireAdmin, async (_req, res) => {
  const requests = await prisma.passwordResetRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
  res.json({ requests });
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
