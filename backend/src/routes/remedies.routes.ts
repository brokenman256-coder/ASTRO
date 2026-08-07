import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optionalUser, AuthedRequest } from "../middleware/auth";
import { generateRemedy } from "../services/prediction.service";

export const remediesRouter = Router();

const requestSchema = z.object({
  concern: z.string().min(1).max(300),
});

remediesRouter.post("/", optionalUser, async (req: AuthedRequest, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { text, configured } = await generateRemedy({ concern: parsed.data.concern });

  const remedy = await prisma.remedy.create({
    data: {
      userId: req.user?.sub,
      concern: parsed.data.concern,
      resultText: text,
    },
  });

  res.status(201).json({ remedy, aiConfigured: configured });
});

remediesRouter.get("/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const remedies = await prisma.remedy.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ remedies });
});
