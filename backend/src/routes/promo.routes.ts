import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { generatePromoBanner } from "../services/promoBot.service";

export const promoRouter = Router();

// Public: the current active banner, if any.
promoRouter.get("/active", async (_req, res) => {
  const banner = await prisma.promoBanner.findFirst({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ banner });
});

// ---- Admin ----

promoRouter.get("/admin/settings", requireAdmin, async (_req, res) => {
  const settings = await prisma.promoBotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({ settings });
});

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  intervalMinutes: z.number().int().min(5).max(1440).optional(),
});

promoRouter.post("/admin/settings", requireAdmin, async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const settings = await prisma.promoBotSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  res.json({ settings });
});

promoRouter.get("/admin/all", requireAdmin, async (_req, res) => {
  const banners = await prisma.promoBanner.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  res.json({ banners });
});

// Generate one right now, on demand, and make it the active banner.
promoRouter.post("/admin/generate", requireAdmin, async (_req, res) => {
  const banner = await generatePromoBanner();
  if (!banner) {
    return res.status(503).json({ error: "AI isn't configured yet, so a banner couldn't be written." });
  }
  await prisma.promoBanner.updateMany({ where: { active: true, NOT: { id: banner.id } }, data: { active: false } });
  res.status(201).json({ banner });
});

promoRouter.patch("/admin/:id", requireAdmin, async (req, res) => {
  const parsed = z.object({ active: z.boolean() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const banner = await prisma.promoBanner.update({ where: { id: req.params.id }, data: parsed.data });
  res.json({ banner });
});
