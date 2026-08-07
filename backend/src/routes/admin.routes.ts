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

// User picker for admin tools (e.g. guided predictions).
adminRouter.get("/users", requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, name: true, email: true },
  });
  res.json({ users });
});
