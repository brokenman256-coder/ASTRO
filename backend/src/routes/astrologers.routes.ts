import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import {
  botAddAstrologer,
  botPruneAstrologers,
  bulkSeedAstrologers,
  inferGenderFromName,
} from "../services/astrologerBot.service";
import { adminTestReply } from "../services/conversation.service";
import { pickUniqueTraditionalPortrait } from "../lib/traditionalPortraits";

export const astrologersRouter = Router();

// Deterministic hash so the "which 100" selection is stable for everyone
// hitting the endpoint on the same day, but different from the day before -
// no cron job or stored selection needed, just a pure function of the date.
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function todaySeed(): string {
  return new Date().toISOString().slice(0, 10); // UTC YYYY-MM-DD
}

// Public: browse today's featured astrologers - a rotating subset of the
// full active pool, sized by dailyDisplayCount (default 100), so a large
// bulk-seeded roster doesn't get dumped on users all at once. The same set
// is shown to everyone all day, and a different set is picked tomorrow.
astrologersRouter.get("/", async (_req, res) => {
  const [all, settings] = await Promise.all([
    prisma.astrologer.findMany({ where: { active: true } }),
    prisma.astrologerBotSettings.findUnique({ where: { id: 1 } }),
  ]);

  const displayCount = settings?.dailyDisplayCount ?? 100;
  const seed = todaySeed();

  const featured = all
    .map((a) => ({ astrologer: a, key: hashString(`${a.id}:${seed}`) }))
    .sort((x, y) => x.key - y.key)
    .slice(0, displayCount)
    .map((x) => x.astrologer)
    .sort((x, y) => y.rating - x.rating);

  // The curated photo pool is much smaller than the full bulk-seeded
  // roster, so two astrologers picked for today's set can collide even
  // though each was assigned uniquely against its own cohort at creation
  // time. Fix any collisions within today's actual selection and persist
  // the reassignment, so every other view of that astrologer (profile
  // page, chat, admin) shows the same corrected photo, not just this list.
  const seenPhotos = new Set<string>();
  const reassignments: { id: string; photoUrl: string }[] = [];
  for (const a of featured) {
    if (seenPhotos.has(a.photoUrl)) {
      const newPhoto = pickUniqueTraditionalPortrait(inferGenderFromName(a.name), seenPhotos);
      a.photoUrl = newPhoto;
      reassignments.push({ id: a.id, photoUrl: newPhoto });
    }
    seenPhotos.add(a.photoUrl);
  }
  if (reassignments.length > 0) {
    await Promise.all(
      reassignments.map((r) => prisma.astrologer.update({ where: { id: r.id }, data: { photoUrl: r.photoUrl } }))
    );
  }

  res.json({ astrologers: featured });
});

// Public: single astrologer profile.
astrologersRouter.get("/:id", async (req, res) => {
  const astrologer = await prisma.astrologer.findUnique({ where: { id: req.params.id } });
  if (!astrologer || !astrologer.active) return res.status(404).json({ error: "Aghori not found" });
  res.json({ astrologer });
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
  personality: z.string().min(1).optional(),
  tone: z.string().min(1).optional(),
  languages: z.array(z.string().min(1)).min(1).optional(),
  greeting: z.string().min(1).optional(),
  astrologyStyle: z.string().min(1).optional(),
  systemInstructions: z.string().min(1).optional(),
  priceRupeesPerMinute: z.number().int().min(1).max(1000).optional(),
});

astrologersRouter.post("/admin", requireAdmin, async (req, res) => {
  const parsed = manualCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const astrologer = await prisma.astrologer.create({
    data: {
      ...parsed.data,
      rating: parsed.data.rating ?? 4.5,
      photoUrl: parsed.data.photoUrl ?? `https://randomuser.me/api/portraits/${Math.random() < 0.5 ? "men" : "women"}/${Math.floor(Math.random() * 100)}.jpg`,
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

// ---- Admin: unrestricted test chat ----
// Lets the admin verify an astrologer's persona/responses directly, with no
// wallet billing, no session/message caps, and no topic restrictions -
// deliberately stateless server-side (see adminTestReply), so nothing here
// touches real conversation data or consultation counts.

const testChatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});
const testChatSchema = z.object({
  history: z.array(testChatTurnSchema).max(50).optional(),
  content: z.string().min(1).max(2000),
});

astrologersRouter.post("/admin/:id/test-chat", requireAdmin, async (req, res) => {
  const parsed = testChatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const result = await adminTestReply(req.params.id, parsed.data.history ?? [], parsed.data.content);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Astrologer not found") {
      return res.status(404).json({ error: "Aghori not found" });
    }
    throw err;
  }
});

// ---- Astrologer roster bot ----

astrologersRouter.post("/admin/bot/add", requireAdmin, async (_req, res) => {
  const astrologer = await botAddAstrologer();
  res.status(201).json({ astrologer, message: "Bot created a new Aghori profile." });
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

const bulkSeedSchema = z.object({
  count: z.number().int().min(1).max(2000).default(1000),
});

// One-time bulk creation - placeholder avatars only (no per-image AI cost).
// Distinct from botAddAstrologer, which is the live "one at a time, with a
// real AI headshot" bot.
astrologersRouter.post("/admin/bot/bulk-seed", requireAdmin, async (req, res) => {
  const parsed = bulkSeedSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const created = await bulkSeedAstrologers(parsed.data.count);
  res.status(201).json({ created, message: `Bulk-created ${created} astrologer profile(s).` });
});

// ---- Roster batching ----
// Groups the roster into fixed-size cohorts an admin can bring fully
// online/offline at once (e.g. one 200-strong batch active while a second
// sits in reserve), independent of individual per-astrologer edits.

astrologersRouter.get("/admin/batches", requireAdmin, async (_req, res) => {
  const rows = await prisma.astrologer.groupBy({
    by: ["batch"],
    _count: { _all: true },
    orderBy: { batch: "asc" },
  });
  const batches = await Promise.all(
    rows.map(async (r) => {
      const activeCount = await prisma.astrologer.count({ where: { batch: r.batch, active: true } });
      return { batch: r.batch, total: r._count._all, active: activeCount, online: activeCount > 0 };
    })
  );
  res.json({ batches });
});

const assignBatchesSchema = z.object({
  batchSize: z.number().int().min(1).max(1000).default(200),
});

// Re-numbers every astrologer into sequential batches of batchSize,
// ordered by creation date - a one-off organizing action, not something
// that needs to run automatically.
astrologersRouter.post("/admin/batches/assign", requireAdmin, async (req, res) => {
  const parsed = assignBatchesSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { batchSize } = parsed.data;

  const all = await prisma.astrologer.findMany({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const updates = all.map((a, i) =>
    prisma.astrologer.update({ where: { id: a.id }, data: { batch: Math.floor(i / batchSize) } })
  );
  await prisma.$transaction(updates);

  const batchCount = Math.ceil(all.length / batchSize);
  res.json({ total: all.length, batchSize, batchCount });
});

const toggleBatchSchema = z.object({ active: z.boolean() });

astrologersRouter.post("/admin/batches/:batch/toggle", requireAdmin, async (req, res) => {
  const parsed = toggleBatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const batch = Number(req.params.batch);
  if (!Number.isInteger(batch)) return res.status(400).json({ error: "Invalid batch number" });

  const result = await prisma.astrologer.updateMany({
    where: { batch },
    data: { active: parsed.data.active, retiredAt: parsed.data.active ? null : new Date() },
  });
  res.json({ batch, active: parsed.data.active, count: result.count });
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
  maxActiveAstrologers: z.number().int().min(1).max(5000).optional(),
  dailyDisplayCount: z.number().int().min(1).max(5000).optional(),
  refreshEnabled: z.boolean().optional(),
  refreshIntervalMinutes: z.number().int().min(1).max(1440).optional(),
  refreshBatchSize: z.number().int().min(1).max(200).optional(),
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
