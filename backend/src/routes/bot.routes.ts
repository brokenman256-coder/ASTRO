import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, AuthedRequest } from "../middleware/auth";
import { formalizeAdminMessage, generateAutonomousMessage } from "../services/botCommand.service";

export const botRouter = Router();

// Public: users see what AstroBot has conveyed, newest first.
botRouter.get("/broadcasts", async (_req, res) => {
  const broadcasts = await prisma.broadcastMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, formalizedText: true, mode: true, createdAt: true },
  });
  res.json({ broadcasts });
});

botRouter.get("/settings", requireAdmin, async (_req, res) => {
  const settings = await prisma.botSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  res.json({ settings });
});

const modeSchema = z.object({ mode: z.enum(["MANUAL", "AUTONOMOUS"]) });

botRouter.post("/admin/mode", requireAdmin, async (req, res) => {
  const parsed = modeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "mode must be MANUAL or AUTONOMOUS" });
  const settings = await prisma.botSettings.upsert({
    where: { id: 1 },
    update: { mode: parsed.data.mode },
    create: { id: 1, mode: parsed.data.mode },
  });
  res.json({ settings });
});

const previewSchema = z.object({ message: z.string().min(1).max(2000) });

// Admin types in normal/casual language; AstroBot rewrites it formally.
// This is a preview only - nothing is stored/shown to users until /publish.
botRouter.post("/admin/command/preview", requireAdmin, async (req, res) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "message is required" });
  const { text, configured } = await formalizeAdminMessage(parsed.data.message);
  res.json({ formalizedText: text, aiConfigured: configured });
});

const publishSchema = z.object({
  rawInput: z.string().min(1).max(2000),
  formalizedText: z.string().min(1).max(4000),
});

botRouter.post("/admin/command/publish", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "rawInput and formalizedText are required" });
  const broadcast = await prisma.broadcastMessage.create({
    data: {
      rawAdminInput: parsed.data.rawInput,
      formalizedText: parsed.data.formalizedText,
      mode: "MANUAL",
      createdByAdminId: req.admin!.sub,
    },
  });
  res.status(201).json({ broadcast });
});

// Admin (or a scheduler) triggers AstroBot to speak on its own, independent
// of any admin-supplied wording - used when the bot is in AUTONOMOUS mode.
botRouter.post("/admin/autonomous/generate", requireAdmin, async (req: AuthedRequest, res) => {
  const { text, configured } = await generateAutonomousMessage();
  const broadcast = await prisma.broadcastMessage.create({
    data: {
      rawAdminInput: "(autonomous - no admin input)",
      formalizedText: text,
      mode: "AUTONOMOUS",
      createdByAdminId: req.admin!.sub,
    },
  });
  res.status(201).json({ broadcast, aiConfigured: configured });
});
