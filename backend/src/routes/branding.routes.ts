import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

export const brandingRouter = Router();

brandingRouter.get("/", async (_req, res) => {
  const branding = await prisma.brandingSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({ branding });
});

const brandingSchema = z.object({
  appName: z.string().min(1).max(60).optional(),
  tagline: z.string().min(1).max(160).optional(),
  aboutText: z.string().min(1).max(2000).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

brandingRouter.put("/admin", requireAdmin, async (req, res) => {
  const parsed = brandingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const branding = await prisma.brandingSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  res.json({ branding });
});
