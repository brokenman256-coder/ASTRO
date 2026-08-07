import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optionalUser, requireAdmin, AuthedRequest } from "../middleware/auth";
import { generatePrediction, generateGuidedPrediction } from "../services/prediction.service";

export const predictionsRouter = Router();

const requestSchema = z.object({
  category: z.enum(["DAILY", "LOVE", "CAREER", "HEALTH", "GENERAL"]),
  zodiacSign: z.string().min(1),
  name: z.string().optional(),
  dob: z.string().optional(),
  question: z.string().max(500).optional(),
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
