import { prisma } from "../lib/prisma";
import { generateAIResponse, resolveAISettings } from "../providers";
import { buildAstrologerSystemPrompt } from "./astrologerPersona.service";

const CONTEXT_WINDOW = 20; // most recent messages sent as context, oldest dropped

// Rough, deliberately approximate cost estimate for the admin usage
// dashboard - not a billing-accurate figure, just enough to spot runaway
// usage. ~$3 per million tokens blended, converted to paise at a fixed rate.
function estimateCostPaise(tokens: number): number {
  const usdPerMillionTokens = 3;
  const usd = (tokens / 1_000_000) * usdPerMillionTokens;
  const paisePerUsd = 8300; // approx INR 83/USD
  return Math.round(usd * paisePerUsd);
}

export class SessionEndedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionEndedError";
  }
}

export class DailyLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DailyLimitError";
  }
}

/** Starts a new conversation with an astrologer, or resumes the existing
 * active one - unless forceNew is set, which always starts fresh (and ends
 * any prior active thread with that same astrologer first). */
export async function startOrResumeConversation(userId: string, astrologerId: string, forceNew: boolean) {
  const astrologer = await prisma.astrologer.findUnique({ where: { id: astrologerId } });
  if (!astrologer || !astrologer.active) {
    throw new Error("Astrologer not found");
  }

  if (!forceNew) {
    const existing = await prisma.conversation.findFirst({
      where: { userId, astrologerId, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return { conversation: existing, astrologer, isNew: false };
  } else {
    await prisma.conversation.updateMany({
      where: { userId, astrologerId, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });
  }

  const conversation = await prisma.conversation.create({
    data: { userId, astrologerId },
  });
  await prisma.astrologer.update({
    where: { id: astrologerId },
    data: { consultationCount: { increment: 1 } },
  });

  return { conversation, astrologer, isNew: true };
}

export async function getOwnedConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { astrologer: true },
  });
  if (!conversation || conversation.userId !== userId) {
    return null; // never distinguish "not found" from "not yours" to the caller
  }
  return conversation;
}

export async function sendMessage(conversationId: string, userId: string, content: string) {
  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) throw new Error("Conversation not found");

  const settings = await resolveAISettings();

  if (conversation.status === "ENDED") {
    throw new SessionEndedError("Your consultation session has ended.");
  }

  const sessionAgeMinutes = (Date.now() - conversation.startedAt.getTime()) / 60000;
  if (
    conversation.messageCount >= settings.maxMessagesPerSession ||
    sessionAgeMinutes >= settings.maxSessionMinutes
  ) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: "ENDED", endedAt: new Date() },
    });
    throw new SessionEndedError("Your consultation session has ended.");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todaysUserMessages = await prisma.message.count({
    where: {
      sender: "USER",
      createdAt: { gte: startOfDay },
      conversation: { userId },
    },
  });
  if (todaysUserMessages >= settings.maxMessagesPerUserPerDay) {
    throw new DailyLimitError("You've reached today's consultation limit. Please try again later.");
  }

  const history = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: CONTEXT_WINDOW,
  });
  const turns = history
    .reverse()
    .map((m) => ({
      role: m.sender === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  turns.push({ role: "user", content });

  const system = buildAstrologerSystemPrompt(conversation.astrologer);
  const { text, tokensUsed, configured } = await generateAIResponse({ system, messages: turns });

  const [userMessage, astrologerMessage] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, sender: "USER", content },
    }),
    prisma.message.create({
      data: { conversationId, sender: "ASTROLOGER", content: text, tokenUsage: tokensUsed || null },
    }),
  ]);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messageCount: { increment: 2 }, tokenUsage: { increment: tokensUsed }, updatedAt: new Date() },
  });

  if (tokensUsed > 0) {
    await prisma.usageRecord.create({
      data: {
        userId,
        conversationId,
        tokens: tokensUsed,
        estimatedCostPaise: estimateCostPaise(tokensUsed),
      },
    });
  }

  return { userMessage, astrologerMessage, configured };
}

export async function endConversation(conversationId: string, userId: string) {
  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) throw new Error("Conversation not found");
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "ENDED", endedAt: new Date() },
  });
}
