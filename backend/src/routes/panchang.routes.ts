import { Router } from "express";
import { prisma } from "../lib/prisma";
import { optionalUser, AuthedRequest } from "../middleware/auth";
import { generatePanchang } from "../services/prediction.service";
import { hashString } from "../lib/hash";

export const panchangRouter = Router();

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Personal luck score (1-100) - deterministic per user+day, so it's stable
// all day but changes tomorrow, without an AI call or any storage. Logged-
// out visitors get a score derived from the date alone (same for everyone).
function luckScore(seed: string): number {
  return 1 + (hashString(seed) % 100);
}

panchangRouter.get("/", optionalUser, async (req: AuthedRequest, res) => {
  const date = todayUtc();

  let panchang = await prisma.dailyPanchang.findUnique({ where: { date } });
  let aiConfigured = true;
  if (!panchang) {
    const { text, configured } = await generatePanchang(date);
    aiConfigured = configured;
    panchang = await prisma.dailyPanchang.upsert({
      where: { date },
      update: {},
      create: { date, resultText: text },
    });
  }

  const luck = luckScore(req.user ? `${req.user.sub}:${date}` : `guest:${date}`);

  res.json({ date, panchang: panchang.resultText, luckScore: luck, aiConfigured });
});
