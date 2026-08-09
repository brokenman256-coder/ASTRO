import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireUser, requireAdmin, AuthedRequest } from "../middleware/auth";
import {
  startOrResumeConversation,
  getOwnedConversation,
  sendMessage,
  endConversation,
  injectAdminMessage,
  SessionEndedError,
  DailyLimitError,
  InsufficientBalanceError,
} from "../services/conversation.service";

export const conversationsRouter = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Please slow down a little before sending another message." },
});

// List this user's conversations (their own only) for consultation history.
conversationsRouter.get("/", requireUser, async (req: AuthedRequest, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: req.user!.sub },
    orderBy: { updatedAt: "desc" },
    include: { astrologer: { select: { id: true, name: true, photoUrl: true, specialty: true } } },
  });
  res.json({ conversations });
});

const startSchema = z.object({
  astrologerId: z.string().min(1),
  forceNew: z.boolean().optional(),
});

conversationsRouter.post("/", requireUser, async (req: AuthedRequest, res) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "astrologerId is required" });

  try {
    const { conversation, astrologer, isNew } = await startOrResumeConversation(
      req.user!.sub,
      parsed.data.astrologerId,
      Boolean(parsed.data.forceNew)
    );
    res.status(201).json({ conversation, astrologer, isNew });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      return res.status(402).json({ error: err.message, insufficientBalance: true });
    }
    res.status(404).json({ error: "Oracle not found" });
  }
});

// ---- Admin: live-chat oversight ----
// Lets an admin watch active consultations and, if needed, direct the
// astrologer's next message - the AI formalizes the admin's casual note
// into an in-character reply, same pattern as guided predictions. These
// routes must come before the generic "/:id" route below, or Express would
// try to treat "admin" as a conversation id.

conversationsRouter.get("/admin/active", requireAdmin, async (_req, res) => {
  const conversations = await prisma.conversation.findMany({
    where: { status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: {
      astrologer: { select: { id: true, name: true, photoUrl: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  res.json({ conversations });
});

conversationsRouter.get("/admin/:id", requireAdmin, async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
    include: { astrologer: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ conversation, messages });
});

const injectSchema = z.object({ directive: z.string().min(1).max(1000) });

conversationsRouter.post("/admin/:id/inject", requireAdmin, async (req, res) => {
  const parsed = injectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "directive is required" });
  try {
    const result = await injectAdminMessage(req.params.id, parsed.data.directive);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Conversation not found") {
      return res.status(404).json({ error: "Conversation not found" });
    }
    throw err;
  }
});

// Ownership check happens inside getOwnedConversation - a conversation ID
// that exists but belongs to someone else looks identical to a
// non-existent one from the caller's perspective (404 either way).
conversationsRouter.get("/:id", requireUser, async (req: AuthedRequest, res) => {
  const conversation = await getOwnedConversation(req.params.id, req.user!.sub);
  if (!conversation) return res.status(404).json({ error: "Conversation not found" });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ conversation, messages });
});

const sendSchema = z.object({ content: z.string().min(1).max(2000) });

conversationsRouter.post("/:id/messages", requireUser, messageLimiter, async (req: AuthedRequest, res) => {
  const parsed = sendSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "content is required" });

  try {
    const result = await sendMessage(req.params.id, req.user!.sub, parsed.data.content);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof SessionEndedError) {
      return res.status(403).json({ error: err.message, sessionEnded: true });
    }
    if (err instanceof DailyLimitError) {
      return res.status(429).json({ error: err.message, dailyLimitReached: true });
    }
    if (err instanceof Error && err.message === "Conversation not found") {
      return res.status(404).json({ error: "Conversation not found" });
    }
    console.error("sendMessage failed:", err);
    res.status(500).json({ error: "Sorry, this Oracle is temporarily unavailable. Please try again." });
  }
});

conversationsRouter.post("/:id/end", requireUser, async (req: AuthedRequest, res) => {
  try {
    const conversation = await endConversation(req.params.id, req.user!.sub);
    res.json({ conversation });
  } catch {
    res.status(404).json({ error: "Conversation not found" });
  }
});
