import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optionalUser, AuthedRequest } from "../middleware/auth";
import { generateTarotReading } from "../services/prediction.service";
import { TAROT_DECK } from "../lib/tarot";

export const tarotRouter = Router();

function drawCards(count: number): string[] {
  const shuffled = [...TAROT_DECK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const requestSchema = z.object({
  question: z.string().max(300).optional(),
  cardCount: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional(),
});

tarotRouter.post("/", optionalUser, async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const cards = drawCards(parsed.data.cardCount ?? 3);
  const { text, configured } = await generateTarotReading({
    cards,
    question: parsed.data.question,
  });

  const reading = await prisma.tarotReading.create({
    data: {
      userId: req.user?.sub,
      question: parsed.data.question,
      cards,
      resultText: text,
    },
  });

  res.status(201).json({ reading, cards, aiConfigured: configured });
});

tarotRouter.get("/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const readings = await prisma.tarotReading.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ readings });
});
