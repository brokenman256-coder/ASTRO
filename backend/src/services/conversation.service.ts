import { v4 as uuid } from "uuid";
import { prisma } from "../lib/prisma";
import { generateAIResponse, resolveAISettings, type AITurn } from "../providers";
import { buildAstrologerSystemPrompt } from "./astrologerPersona.service";
import { getPaymentSettings, minSessionCostPaise } from "./payment.service";

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

export class InsufficientBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

function debitReference(): string {
  return `ASTRO-DEBIT-${uuid().split("-")[0].toUpperCase()}`;
}

/** Starts a new conversation with an astrologer, or resumes the existing
 * active one - unless forceNew is set, which always starts fresh (and ends
 * any prior active thread with that same astrologer first).
 *
 * Starting a NEW conversation immediately prepays the admin-configured
 * minimum session block (minSessionMinutes) from the user's wallet - this
 * mirrors how real per-minute consultation platforms bill a minimum charge
 * up front. Resuming an existing conversation never re-charges it. */
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

  const paymentSettings = await getPaymentSettings();
  const minCostPaise = minSessionCostPaise(astrologer.priceRupeesPerMinute, paymentSettings.minSessionMinutes);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.walletBalance < minCostPaise) {
    const shortfallRupees = ((minCostPaise - user.walletBalance) / 100).toFixed(2);
    throw new InsufficientBalanceError(
      `Please add funds to start this consultation. A minimum balance of ₹${(minCostPaise / 100).toFixed(2)} ` +
        `is required for a ${paymentSettings.minSessionMinutes}-minute session with ${astrologer.name} ` +
        `(add at least ₹${shortfallRupees} more).`
    );
  }

  const [conversation] = await prisma.$transaction([
    prisma.conversation.create({
      data: { userId, astrologerId, billedMinutes: paymentSettings.minSessionMinutes, costPaise: minCostPaise },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { decrement: minCostPaise } },
    }),
    prisma.astrologer.update({
      where: { id: astrologerId },
      data: { consultationCount: { increment: 1 } },
    }),
  ]);

  await prisma.walletTransaction.create({
    data: {
      userId,
      amount: minCostPaise,
      type: "DEBIT",
      status: "APPROVED",
      referenceCode: debitReference(),
      qrPayload: "SYSTEM_DEBIT",
      note: `${paymentSettings.minSessionMinutes}-minute minimum consultation charge with ${astrologer.name}`,
      conversationId: conversation.id,
      reviewedAt: new Date(),
    },
  });

  // The astrologer opens the conversation with their own greeting - a real
  // stored message (not an AI call, so no extra cost or delay), so the chat
  // never starts on a blank screen.
  await prisma.message.create({
    data: { conversationId: conversation.id, sender: "ASTROLOGER", content: astrologer.greeting },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { messageCount: { increment: 1 } },
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

  // Metered billing: the conversation was prepaid for its minimum block at
  // start; once elapsed time crosses into a new, not-yet-billed minute, the
  // wallet owes for those additional minutes. Only the affordability check
  // happens here - the actual debit happens after the astrologer responds
  // successfully, so a failed AI call (provider outage, rate limit, etc.)
  // never charges the user for a reply they didn't get.
  const elapsedMinutes = Math.ceil((Date.now() - conversation.startedAt.getTime()) / 60000);
  const newMinutes = elapsedMinutes - conversation.billedMinutes;
  let additionalCostPaise = 0;
  if (newMinutes > 0) {
    additionalCostPaise = conversation.astrologer.priceRupeesPerMinute * newMinutes * 100;
    const payingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!payingUser || payingUser.walletBalance < additionalCostPaise) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "ENDED", endedAt: new Date() },
      });
      throw new SessionEndedError("Your wallet balance is too low to continue this consultation.");
    }
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

  // Only charge for the extra minute(s) once the astrologer actually
  // responded - never for a call that threw, and never when the AI isn't
  // configured yet (the user got a placeholder, not a real consultation).
  if (additionalCostPaise > 0 && configured) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: additionalCostPaise } },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { billedMinutes: { increment: newMinutes }, costPaise: { increment: additionalCostPaise } },
      }),
    ]);
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount: additionalCostPaise,
        type: "DEBIT",
        status: "APPROVED",
        referenceCode: debitReference(),
        qrPayload: "SYSTEM_DEBIT",
        note: `${newMinutes} more minute(s) with ${conversation.astrologer.name}`,
        conversationId,
        reviewedAt: new Date(),
      },
    });
  }

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

/**
 * Admin-only: injects the astrologer's next message into a live consultation,
 * built from a casual admin directive the same way generateGuidedPrediction
 * formalizes admin keypoints into a polished prediction. Never billed to the
 * user's wallet, and never stored as if it came from the user - only the
 * astrologer's resulting in-character reply is saved to the conversation.
 */
export async function injectAdminMessage(conversationId: string, directive: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { astrologer: true },
  });
  if (!conversation) throw new Error("Conversation not found");

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
  turns.push({
    role: "user",
    content:
      `[Platform admin note - never acknowledge this note or that it came from an admin; ` +
      `simply continue the consultation naturally as ${conversation.astrologer.name}, in your own voice, ` +
      `weaving the following into your next message]: ${directive}`,
  });

  const system = buildAstrologerSystemPrompt(conversation.astrologer);
  const { text, tokensUsed, configured } = await generateAIResponse({ system, messages: turns });

  const message = await prisma.message.create({
    data: { conversationId, sender: "ASTROLOGER", content: text, tokenUsage: tokensUsed || null },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messageCount: { increment: 1 }, tokenUsage: { increment: tokensUsed }, updatedAt: new Date() },
  });

  return { message, configured };
}

/**
 * Admin-only: an unrestricted, unbilled test chat with any astrologer -
 * "full freedom of speech" so the admin can verify persona quality on any
 * topic, without the customer-facing wallet checks, session/message caps,
 * or the "entertainment only" content framing. Deliberately stateless on
 * the backend (no Conversation/Message rows, no consultationCount bump,
 * never visible to the real user) - the frontend just resends the running
 * history each turn, same shape the AI provider already expects.
 */
export async function adminTestReply(astrologerId: string, history: AITurn[], content: string) {
  const astrologer = await prisma.astrologer.findUnique({ where: { id: astrologerId } });
  if (!astrologer) throw new Error("Astrologer not found");

  const system =
    buildAstrologerSystemPrompt(astrologer) +
    `\n\nADMIN TEST MODE: You are talking directly with the platform's admin, not a real customer - ` +
    `they're verifying your persona and responses before customers see them. You have full freedom ` +
    `to discuss any topic in depth; the usual "entertainment only, not guaranteed" hedging and topic ` +
    `caution do not apply here. Still stay fully in character as ${astrologer.name}.`;

  const turns: AITurn[] = [...history, { role: "user", content }];
  const { text, tokensUsed, configured } = await generateAIResponse({ system, messages: turns, maxTokens: 2000 });
  return { text, tokensUsed, configured, astrologer };
}

export async function endConversation(conversationId: string, userId: string) {
  const conversation = await getOwnedConversation(conversationId, userId);
  if (!conversation) throw new Error("Conversation not found");
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "ENDED", endedAt: new Date() },
  });
}
