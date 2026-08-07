import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { botAddAstrologer, botPruneAstrologers } from "../services/astrologerBot.service";

export const astrologersRouter = Router();

// Public: browse active astrologers
astrologersRouter.get("/", async (_req, res) => {
  const astrologers = await prisma.astrologer.findMany({
    where: { active: true },
    orderBy: { rating: "desc" },
  });
  res.json({ astrologers });
});

// ---- Admin management ----

astrologersRouter.get("/admin/all", requireAdmin, async (_req, res) => {
  const astrologers = await prisma.astrologer.findMany({ orderBy: { createdAt: "desc" } });
  res.json({ astrologers });
});

const manualCreateSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().min(1),
  experienceYears: z.number().int().min(0).max(70),
  rating: z.number().min(0).max(5).optional(),
  bio: z.string().min(1),
  photoUrl: z.string().url().optional(),
});

astrologersRouter.post("/admin", requireAdmin, async (req, res) => {
  const parsed = manualCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const astrologer = await prisma.astrologer.create({
    data: {
      ...parsed.data,
      rating: parsed.data.rating ?? 4.5,
      photoUrl: parsed.data.photoUrl ?? `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(parsed.data.name)}`,
      source: "MANUAL",
    },
  });
  res.status(201).json({ astrologer });
});

astrologersRouter.patch("/admin/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const parsed = manualCreateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const astrologer = await prisma.astrologer.update({ where: { id }, data: parsed.data });
  res.json({ astrologer });
});

astrologersRouter.delete("/admin/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await prisma.astrologer.update({
    where: { id },
    data: { active: false, retiredAt: new Date() },
  });
  res.json({ ok: true });
});

// ---- Astrologer roster bot ----

astrologersRouter.post("/admin/bot/add", requireAdmin, async (_req, res) => {
  const astrologer = await botAddAstrologer();
  res.status(201).json({ astrologer, message: "Bot created a new astrologer profile." });
});

const pruneSchema = z.object({
  maxToRetire: z.number().int().min(1).max(20).optional(),
  minRating: z.number().min(0).max(5).optional(),
});

astrologersRouter.post("/admin/bot/prune", requireAdmin, async (req, res) => {
  const parsed = pruneSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const retired = await botPruneAstrologers(parsed.data);
  res.json({ retired, message: `Bot retired ${retired.length} astrologer profile(s).` });
});

// ---- Astrologer auto-bot scheduler ----

astrologersRouter.get("/admin/bot/settings", requireAdmin, async (_req, res) => {
  const settings = await prisma.astrologerBotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({ settings });
});

const schedulerSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(1).max(1440).optional(),
  maxActiveAstrologers: z.number().int().min(1).max(500).optional(),
});

astrologersRouter.post("/admin/bot/settings", requireAdmin, async (req, res) => {
  const parsed = schedulerSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const settings = await prisma.astrologerBotSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  res.json({ settings });
});
