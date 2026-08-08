import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

export const mediaRouter = Router();

// Admin-only: all uploaded palm photos and tarot draws across every user,
// for oversight and quality-checking the AI readings - not a public gallery.
mediaRouter.get("/admin/palm", requireAdmin, async (_req, res) => {
  const readings = await prisma.palmReading.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ readings });
});

mediaRouter.get("/admin/tarot", requireAdmin, async (_req, res) => {
  const readings = await prisma.tarotReading.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ readings });
});
