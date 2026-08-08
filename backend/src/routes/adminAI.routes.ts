import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { encryptSecret } from "../lib/secretBox";
import { resolveAISettings, generateAIResponse } from "../providers";

export const adminAIRouter = Router();

// Never return the raw key, encrypted or not - only whether one is set.
function toPublicSettings(settings: {
  provider: string;
  apiUrl: string | null;
  model: string;
  encryptedApiKey: string | null;
  temperature: number;
  maxResponseTokens: number;
  maxMessagesPerSession: number;
  maxSessionMinutes: number;
  maxMessagesPerUserPerDay: number;
  updatedAt: Date;
}) {
  return {
    provider: settings.provider,
    apiUrl: settings.apiUrl,
    model: settings.model,
    hasApiKey: Boolean(settings.encryptedApiKey),
    temperature: settings.temperature,
    maxResponseTokens: settings.maxResponseTokens,
    maxMessagesPerSession: settings.maxMessagesPerSession,
    maxSessionMinutes: settings.maxSessionMinutes,
    maxMessagesPerUserPerDay: settings.maxMessagesPerUserPerDay,
    updatedAt: settings.updatedAt,
  };
}

// Public, read-only: lets the chat UI show an accurate live countdown and
// "N messages left" without exposing anything sensitive (provider, model,
// keys, temperature stay admin-only).
adminAIRouter.get("/session-limits", async (_req, res) => {
  const settings = await prisma.adminAISettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({
    maxSessionMinutes: settings.maxSessionMinutes,
    maxMessagesPerSession: settings.maxMessagesPerSession,
  });
});

adminAIRouter.get("/", requireAdmin, async (_req, res) => {
  const settings = await prisma.adminAISettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({ settings: toPublicSettings(settings) });
});

const updateSchema = z.object({
  provider: z.enum(["anthropic", "openai", "compatible", "local"]).optional(),
  apiUrl: z.string().url().optional().or(z.literal("")),
  model: z.string().min(1).optional(),
  apiKey: z.string().optional(), // plaintext in, encrypted before storage; omit to leave unchanged
  temperature: z.number().min(0).max(2).optional(),
  maxResponseTokens: z.number().int().min(50).max(4000).optional(),
  maxMessagesPerSession: z.number().int().min(1).max(500).optional(),
  maxSessionMinutes: z.number().int().min(1).max(1440).optional(),
  maxMessagesPerUserPerDay: z.number().int().min(1).max(2000).optional(),
});

adminAIRouter.put("/", requireAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { apiKey, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (apiKey) {
    const encrypted = encryptSecret(apiKey);
    if (!encrypted) {
      return res.status(503).json({
        error: "ENCRYPTION_KEY is not configured on the server, so API keys can't be stored securely yet.",
      });
    }
    data.encryptedApiKey = encrypted;
  }

  const settings = await prisma.adminAISettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
  res.json({ settings: toPublicSettings(settings) });
});

adminAIRouter.post("/test", requireAdmin, async (_req, res) => {
  const resolved = await resolveAISettings();
  if (!resolved.configured) {
    return res.json({ ok: false, message: "No API key configured (checked stored settings and env vars)." });
  }
  try {
    const result = await generateAIResponse({
      system: "Reply with exactly the word: ok",
      messages: [{ role: "user", content: "ping" }],
      maxTokens: 10,
    });
    res.json({ ok: true, message: `Connected to ${resolved.provider} (${resolved.model}). Response: "${result.text.trim()}"` });
  } catch (err) {
    res.json({ ok: false, message: err instanceof Error ? err.message : "Connection test failed." });
  }
});
