import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optionalUser, requireUser, requireAdmin, AuthedRequest } from "../middleware/auth";
import { generatePrediction, generateGuidedPrediction } from "../services/prediction.service";
import { zodiacFromDate, ZODIAC_DATA, RUDRAKSHA_BY_ZODIAC } from "../lib/zodiac";

export const predictionsRouter = Router();

// Personalized daily horoscope + rudraksha recommendation - uses the sign
// the user told us at signup if they gave one (it's what they identify
// with, even if it doesn't perfectly match their DOB), otherwise derives it
// from their stored date of birth. Different for every user, cached for the
// day so it isn't regenerated (and re-charged in AI usage) on every view.
predictionsRouter.get("/personal-daily", requireUser, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const zodiac = user.zodiacSign
    ? ZODIAC_DATA.find((z) => z.name === user.zodiacSign)
    : user.dob
    ? zodiacFromDate(new Date(user.dob))
    : undefined;
  if (!zodiac) {
    return res.status(400).json({ error: "Add your zodiac sign or date of birth in your profile to see your personal horoscope." });
  }
  const rudraksha = RUDRAKSHA_BY_ZODIAC[zodiac.name];

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const cached = await prisma.prediction.findFirst({
    where: {
      userId: user.id,
      category: "DAILY",
      zodiacSign: zodiac.name,
      createdAt: { gte: startOfDay },
    },
    orderBy: { createdAt: "desc" },
  });

  if (cached) {
    return res.json({ zodiacSign: zodiac.name, symbol: zodiac.symbol, horoscope: cached.resultText, rudraksha, aiConfigured: true });
  }

  const { text, configured } = await generatePrediction({
    category: "DAILY",
    zodiacSign: zodiac.name,
    name: user.name,
    dob: user.dob ? user.dob.toISOString().slice(0, 10) : undefined,
    period: "daily",
  });

  await prisma.prediction.create({
    data: {
      userId: user.id,
      category: "DAILY",
      zodiacSign: zodiac.name,
      inputDetails: { personal: true, period: "daily" },
      resultText: text,
    },
  });

  res.json({ zodiacSign: zodiac.name, symbol: zodiac.symbol, horoscope: text, rudraksha, aiConfigured: configured });
});

const requestSchema = z.object({
  category: z.enum(["DAILY", "LOVE", "CAREER", "HEALTH", "GENERAL"]),
  zodiacSign: z.string().min(1),
  name: z.string().optional(),
  dob: z.string().optional(),
  question: z.string().max(500).optional(),
  period: z.enum(["daily", "weekly", "monthly"]).optional(),
});

predictionsRouter.post("/", optionalUser, async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { text, configured } = await generatePrediction(parsed.data);

  const prediction = await prisma.prediction.create({
    data: {
      userId: req.user?.sub,
      category: parsed.data.category,
      zodiacSign: parsed.data.zodiacSign,
      inputDetails: parsed.data,
      resultText: text,
    },
  });

  res.status(201).json({ prediction, aiConfigured: configured });
});

predictionsRouter.get("/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const predictions = await prisma.prediction.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ predictions });
});

// ---- Admin: guided predictions ----
// Admin gives casual keypoints about a specific user's situation; AstroBot
// formalizes them into a full prediction and saves it straight to that
// user's account, exactly as if the AI had generated it independently.

const guidedSchema = z.object({
  userId: z.string().min(1),
  category: z.enum(["DAILY", "LOVE", "CAREER", "HEALTH", "GENERAL"]),
  zodiacSign: z.string().min(1),
  keypoints: z.string().min(1).max(1000),
});

predictionsRouter.post("/admin/generate-for-user", requireAdmin, async (req, res) => {
  const parsed = guidedSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const { text, configured } = await generateGuidedPrediction({
    category: parsed.data.category,
    zodiacSign: parsed.data.zodiacSign,
    userName: user.name,
    keypoints: parsed.data.keypoints,
  });

  const prediction = await prisma.prediction.create({
    data: {
      userId: user.id,
      category: parsed.data.category,
      zodiacSign: parsed.data.zodiacSign,
      inputDetails: { adminGenerated: true, keypoints: parsed.data.keypoints },
      resultText: text,
    },
  });

  res.status(201).json({ prediction, aiConfigured: configured });
});
