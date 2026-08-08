import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireUser, requireAdmin, optionalUser, AuthedRequest } from "../middleware/auth";
import { buildTopupQr } from "../services/wallet.service";
import { getPaymentSettings } from "../services/payment.service";

export const walletRouter = Router();

walletRouter.get("/balance", requireUser, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ balancePaise: user.walletBalance });
});

// Public, read-only: lets the frontend show the minimum recharge amount and
// minimum session length before a user is even logged in.
walletRouter.get("/payment-settings", async (_req, res) => {
  const settings = await getPaymentSettings();
  res.json({
    minRechargeAmountPaise: settings.minRechargeAmountPaise,
    minSessionMinutes: settings.minSessionMinutes,
  });
});

// Public, read-only: active recharge bonus tiers, shown as promo cards on
// the wallet page to encourage bigger top-ups. When the caller is logged
// in, each scheme is annotated with whether they can actually claim it -
// first-time-only schemes only apply before a user's first approved
// top-up - so the UI never advertises a bonus that won't be honored.
walletRouter.get("/schemes", optionalUser, async (req: AuthedRequest, res) => {
  const schemes = await prisma.rechargeScheme.findMany({
    where: { active: true },
    orderBy: { minAmountPaise: "asc" },
  });

  let hasRecharged = true; // default: hide first-time offers from logged-out visitors
  if (req.user) {
    const priorApproved = await prisma.walletTransaction.findFirst({
      where: { userId: req.user.sub, status: "APPROVED" },
      select: { id: true },
    });
    hasRecharged = Boolean(priorApproved);
  }

  const annotated = schemes.map((s) => ({
    ...s,
    eligible: !s.isFirstTimeOnly || !hasRecharged,
  }));
  res.json({ schemes: annotated });
});

const topupSchema = z.object({ amountPaise: z.number().int().max(500000) });

// User requests to add money: generates a scan-to-pay QR + a pending
// transaction. Nothing is credited until an admin reviews and approves it.
walletRouter.post("/topup-request", requireUser, async (req: AuthedRequest, res) => {
  const parsed = topupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid amount." });

  const paymentSettings = await getPaymentSettings();
  if (parsed.data.amountPaise < paymentSettings.minRechargeAmountPaise) {
    return res.status(400).json({
      error: `Minimum recharge amount is ₹${(paymentSettings.minRechargeAmountPaise / 100).toFixed(2)}.`,
    });
  }

  const { referenceCode, qrPayload, qrDataUrl } = await buildTopupQr({
    amountPaise: parsed.data.amountPaise,
  });

  const tx = await prisma.walletTransaction.create({
    data: {
      userId: req.user!.sub,
      amount: parsed.data.amountPaise,
      type: "TOPUP_REQUEST",
      status: "PENDING",
      referenceCode,
      qrPayload,
    },
  });

  res.status(201).json({ transaction: tx, qrDataUrl });
});

walletRouter.get("/transactions", requireUser, async (req: AuthedRequest, res) => {
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
  });
  res.json({ transactions });
});

// ---- Admin approval queue ----

walletRouter.get("/admin/pending", requireAdmin, async (_req, res) => {
  const pending = await prisma.walletTransaction.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ pending });
});

walletRouter.post("/admin/:id/approve", requireAdmin, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const tx = await prisma.walletTransaction.findUnique({ where: { id } });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  if (tx.status !== "PENDING") return res.status(409).json({ error: "Transaction already reviewed" });

  // Apply whichever active scheme gives the biggest bonus this transaction
  // qualifies for - including first-time-only schemes (e.g. a first-recharge
  // double bonus), but only if this is genuinely this user's first approval.
  const priorApproved = await prisma.walletTransaction.findFirst({
    where: { userId: tx.userId, status: "APPROVED" },
    select: { id: true },
  });
  const isFirstRecharge = !priorApproved;

  const candidateSchemes = await prisma.rechargeScheme.findMany({
    where: {
      active: true,
      minAmountPaise: { lte: tx.amount },
      ...(isFirstRecharge ? {} : { isFirstTimeOnly: false }),
    },
    orderBy: { bonusPercent: "desc" },
    take: 1,
  });
  const scheme = candidateSchemes[0];
  const bonusPaise = scheme ? Math.floor((tx.amount * scheme.bonusPercent) / 100) : 0;
  const note = scheme ? `+${scheme.bonusPercent}% bonus applied (${scheme.label})` : tx.note;

  const [updatedTx] = await prisma.$transaction([
    prisma.walletTransaction.update({
      where: { id },
      data: { status: "APPROVED", bonusPaise, note, reviewedByAdminId: req.admin!.sub, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: tx.userId },
      data: { walletBalance: { increment: tx.amount + bonusPaise } },
    }),
  ]);

  res.json({ transaction: updatedTx });
});

walletRouter.post("/admin/:id/reject", requireAdmin, async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const tx = await prisma.walletTransaction.findUnique({ where: { id } });
  if (!tx) return res.status(404).json({ error: "Transaction not found" });
  if (tx.status !== "PENDING") return res.status(409).json({ error: "Transaction already reviewed" });

  const updatedTx = await prisma.walletTransaction.update({
    where: { id },
    data: { status: "REJECTED", reviewedByAdminId: req.admin!.sub, reviewedAt: new Date() },
  });

  res.json({ transaction: updatedTx });
});

// ---- Admin: payment/billing configuration ----

walletRouter.get("/admin/payment-settings", requireAdmin, async (_req, res) => {
  const settings = await getPaymentSettings();
  res.json({ settings });
});

const paymentSettingsSchema = z.object({
  minRechargeAmountPaise: z.number().int().min(100).max(500000).optional(),
  minSessionMinutes: z.number().int().min(1).max(120).optional(),
});

walletRouter.put("/admin/payment-settings", requireAdmin, async (req, res) => {
  const parsed = paymentSettingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const settings = await prisma.paymentSettings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  res.json({ settings });
});

// ---- Admin: recharge bonus schemes ----

walletRouter.get("/admin/schemes", requireAdmin, async (_req, res) => {
  const schemes = await prisma.rechargeScheme.findMany({ orderBy: { minAmountPaise: "asc" } });
  res.json({ schemes });
});

const schemeSchema = z.object({
  label: z.string().min(1).max(60),
  minAmountPaise: z.number().int().min(100).max(500000),
  bonusPercent: z.number().int().min(1).max(200),
  isFirstTimeOnly: z.boolean().optional(),
});

walletRouter.post("/admin/schemes", requireAdmin, async (req, res) => {
  const parsed = schemeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const scheme = await prisma.rechargeScheme.create({ data: parsed.data });
  res.status(201).json({ scheme });
});

const schemeUpdateSchema = schemeSchema.partial().extend({ active: z.boolean().optional() });

walletRouter.patch("/admin/schemes/:id", requireAdmin, async (req, res) => {
  const parsed = schemeUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  try {
    const scheme = await prisma.rechargeScheme.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ scheme });
  } catch {
    res.status(404).json({ error: "Scheme not found" });
  }
});

walletRouter.delete("/admin/schemes/:id", requireAdmin, async (req, res) => {
  try {
    await prisma.rechargeScheme.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Scheme not found" });
  }
});
