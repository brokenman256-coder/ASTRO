import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

export const adminRouter = Router();

// Aggregate stats for the admin dashboard overview.
adminRouter.get("/overview", requireAdmin, async (_req, res) => {
  const [userCount, activeAstrologers, pendingTx, predictionCount, palmReadingCount, latestBroadcast] =
    await Promise.all([
      prisma.user.count(),
      prisma.astrologer.count({ where: { active: true } }),
      prisma.walletTransaction.count({ where: { status: "PENDING" } }),
      prisma.prediction.count(),
      prisma.palmReading.count(),
      prisma.broadcastMessage.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

  res.json({
    userCount,
    activeAstrologers,
    pendingTx,
    predictionCount,
    palmReadingCount,
    latestBroadcast,
  });
});

// User list for admin tools (picker + the Users page).
adminRouter.get("/users", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true, walletBalance: true, createdAt: true },
  });
  res.json({ users });
});

// Full detail for one user - every prediction, palm reading (including the
// actual uploaded photo), remedy, and wallet transaction they've generated,
// so admins can review anything a user has shared with the platform.
// passwordHash is never included.
adminRouter.get("/users/:id/detail", requireAdmin, async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, walletBalance: true, createdAt: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });

  const [predictions, palmReadings, remedies, transactions] = await Promise.all([
    prisma.prediction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
    prisma.palmReading.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
    prisma.remedy.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
    prisma.walletTransaction.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" } }),
  ]);

  res.json({ user, predictions, palmReadings, remedies, transactions });
});
