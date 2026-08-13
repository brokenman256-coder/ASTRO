import { Router } from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { encryptSecret } from "../lib/secretBox";
import {
  exchangeInstagramCode,
  fetchInstagramProfile,
  instagramAuthorizeUrl,
  instagramConfigured,
} from "../lib/instagram";
import {
  ConsentRequiredError,
  getTrainingStatus,
  importFromDataExport,
  importFromGraphApi,
  revokeTrainingConsent,
} from "../services/instagramImport.service";
import {
  hashPassword,
  signUserToken,
  USER_COOKIE,
  userCookieOptions,
} from "../lib/auth";
import { requireUser, optionalUser, AuthedRequest } from "../middleware/auth";

export const instagramRouter = Router();

const oauthLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20 });
const consentLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20 });

const STATE_COOKIE = "astro_ig_oauth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok =
      name.endsWith(".zip") ||
      name.endsWith(".json") ||
      file.mimetype === "application/zip" ||
      file.mimetype === "application/json" ||
      file.mimetype === "application/x-zip-compressed";
    if (!ok) return cb(new Error("Upload a .zip or .json file from Instagram's official data export"));
    cb(null, true);
  },
});

function frontendRedirect(query: Record<string, string>): string {
  const url = new URL("/login/instagram", env.frontendOrigin);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url.toString();
}

function signOauthState(extra: { linkUserId?: string }): string {
  return jwt.sign({ purpose: "instagram-oauth", ...extra, nonce: crypto.randomBytes(8).toString("hex") }, env.jwtUserSecret, {
    expiresIn: "10m",
  });
}

instagramRouter.get("/config", (_req, res) => {
  res.json({
    enabled: instagramConfigured(),
    chats:
      "Instagram does not give apps personal DMs. After you accept, we pull the official professional inbox plus any data-export files you upload.",
  });
});

instagramRouter.get("/", oauthLimiter, optionalUser, (req: AuthedRequest, res) => {
  if (!instagramConfigured()) {
    return res.status(503).json({
      error: "Instagram login is not configured yet. Set INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and INSTAGRAM_REDIRECT_URI.",
    });
  }
  const linkUserId = req.user?.sub;
  const state = signOauthState({ linkUserId });
  res.cookie(STATE_COOKIE, state, { ...userCookieOptions(), maxAge: 10 * 60 * 1000 });
  res.redirect(302, instagramAuthorizeUrl(state));
});

instagramRouter.get("/callback", oauthLimiter, async (req: AuthedRequest, res) => {
  const error = typeof req.query.error === "string" ? req.query.error : "";
  if (error) return res.redirect(frontendRedirect({ error: "instagram_denied" }));

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = req.cookies?.[STATE_COOKIE];
  if (!code || !state || !cookieState || cookieState !== state) {
    return res.redirect(frontendRedirect({ error: "invalid_state" }));
  }

  let linkUserId: string | undefined;
  try {
    const decoded = jwt.verify(state, env.jwtUserSecret) as { purpose?: string; linkUserId?: string };
    if (decoded.purpose !== "instagram-oauth") throw new Error("bad state");
    linkUserId = decoded.linkUserId;
  } catch {
    return res.redirect(frontendRedirect({ error: "expired_state" }));
  }

  try {
    const token = await exchangeInstagramCode(code);
    const profile = await fetchInstagramProfile(token.accessToken);
    const igUserId = profile.userId || token.userId;
    if (!igUserId) return res.redirect(frontendRedirect({ error: "no_ig_user" }));

    const encrypted = encryptSecret(token.accessToken);
    const existingByIg = await prisma.user.findUnique({ where: { instagramUserId: igUserId } });

    let user = existingByIg;
    if (linkUserId && (!user || user.id === linkUserId)) {
      user = await prisma.user.update({
        where: { id: linkUserId },
        data: {
          instagramUserId: igUserId,
          instagramUsername: profile.username,
          instagramAccountType: profile.accountType,
          instagramAccessToken: encrypted,
          instagramTokenExpiresAt: token.expiresAt,
        },
      });
    } else if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          instagramUsername: profile.username,
          instagramAccountType: profile.accountType,
          instagramAccessToken: encrypted,
          instagramTokenExpiresAt: token.expiresAt,
        },
      });
    } else {
      const placeholderEmail = `ig_${igUserId}@instagram.astro.local`;
      user = await prisma.user.create({
        data: {
          name: profile.name || profile.username,
          email: placeholderEmail,
          passwordHash: await hashPassword(crypto.randomBytes(32).toString("hex")),
          instagramUserId: igUserId,
          instagramUsername: profile.username,
          instagramAccountType: profile.accountType,
          instagramAccessToken: encrypted,
          instagramTokenExpiresAt: token.expiresAt,
        },
      });
    }

    const session = signUserToken({ sub: user.id, email: user.email, role: "user" });
    res.cookie(USER_COOKIE, session, userCookieOptions());
    res.clearCookie(STATE_COOKIE, { path: "/" });
    const pending = user.trainingConsent ? "0" : "1";
    return res.redirect(frontendRedirect({ ok: "1", consent: pending }));
  } catch (err) {
    console.error(err);
    return res.redirect(frontendRedirect({ error: "instagram_failed" }));
  }
});

instagramRouter.get("/status", requireUser, async (req: AuthedRequest, res) => {
  const status = await getTrainingStatus(req.user!.sub);
  if (!status) return res.status(404).json({ error: "User not found" });
  res.json(status);
});

const consentSchema = z.object({ accepted: z.boolean() });

instagramRouter.post("/consent", requireUser, consentLimiter, async (req: AuthedRequest, res) => {
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "accepted is required" });

  if (!parsed.data.accepted) {
    await revokeTrainingConsent(req.user!.sub);
    return res.json({ trainingConsent: false, imported: false });
  }

  await prisma.user.update({
    where: { id: req.user!.sub },
    data: { trainingConsent: true, trainingConsentAt: new Date(), trainingConsentRevokedAt: null },
  });

  let imported: Awaited<ReturnType<typeof importFromGraphApi>> | null = null;
  let importError: string | null = null;
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (user?.instagramAccessToken) {
    try {
      imported = await importFromGraphApi(req.user!.sub);
    } catch (err) {
      if (err instanceof ConsentRequiredError) throw err;
      importError = err instanceof Error ? err.message : "Import failed";
    }
  }

  res.json({
    trainingConsent: true,
    imported: Boolean(imported),
    import: imported,
    importError,
  });
});

instagramRouter.post("/import", requireUser, consentLimiter, async (req: AuthedRequest, res) => {
  try {
    const imported = await importFromGraphApi(req.user!.sub);
    res.json(imported);
  } catch (err) {
    if (err instanceof ConsentRequiredError) return res.status(403).json({ error: err.message });
    return res.status(400).json({ error: err instanceof Error ? err.message : "Import failed" });
  }
});

instagramRouter.post("/export", requireUser, consentLimiter, upload.array("files", 8), async (req: AuthedRequest, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) return res.status(400).json({ error: "Upload Instagram's official .zip or message_*.json files" });
  try {
    const imported = await importFromDataExport(
      req.user!.sub,
      files.map((f) => ({ name: f.originalname, buffer: f.buffer }))
    );
    res.json(imported);
  } catch (err) {
    if (err instanceof ConsentRequiredError) return res.status(403).json({ error: err.message });
    return res.status(400).json({ error: err instanceof Error ? err.message : "Export import failed" });
  }
});
