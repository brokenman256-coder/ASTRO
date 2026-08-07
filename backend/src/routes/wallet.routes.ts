import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireUser, requireAdmin, AuthedRequest } from "../middleware/auth";
import { buildTopupQr } from "../services/wallet.service";

export const walletRouter = Router();

walletRouter.get("/balance", requireUser, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ balancePaise: user.walletBalance });
});

const topupSchema = z.object({ amountPaise: z.number().int().min(100).max(500000) });

// User requests to add money: generates a scan-to-pay QR + a pending
// transaction. Nothing is credited until an admin reviews and approves it.
walletRouter.post("/topup-request", requireUser, async (req: AuthedRequest, res) => {
  const parsed = topupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "amountPaise must be between 100 and 500000" });

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

  const [updatedTx] = await prisma.$transaction([
    prisma.walletTransaction.update({
      where: { id },
      data: { status: "APPROVED", reviewedByAdminId: req.admin!.sub, reviewedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: tx.userId },
      data: { walletBalance: { increment: tx.amount } },
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
