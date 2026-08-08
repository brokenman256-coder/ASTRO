import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { optionalUser, AuthedRequest } from "../middleware/auth";
import { generateKundliReading, generateKundliMatch } from "../services/prediction.service";
import { hashString } from "../lib/hash";

export const kundliRouter = Router();

const kundliSchema = z.object({
  name: z.string().min(1).max(100),
  dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
  timeOfBirth: z.string().max(20).optional(),
  placeOfBirth: z.string().max(120).optional(),
});

kundliRouter.post("/", optionalUser, async (req: AuthedRequest, res) => {
  const parsed = kundliSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, dob, timeOfBirth, placeOfBirth } = parsed.data;

  const { text, configured } = await generateKundliReading({ name, dob, timeOfBirth, placeOfBirth });

  const reading = await prisma.kundliReading.create({
    data: { userId: req.user?.sub, name, dob: new Date(dob), timeOfBirth, placeOfBirth, resultText: text },
  });

  res.status(201).json({ reading, aiConfigured: configured });
});

kundliRouter.get("/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const readings = await prisma.kundliReading.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ readings });
});

// ---- Kundli matching (Guna Milan style compatibility) ----

const matchSchema = z.object({
  person1Name: z.string().min(1).max(100),
  person1Dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
  person2Name: z.string().min(1).max(100),
  person2Dob: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date of birth"),
});

// Deterministic (same two people always get the same score) rather than
// random, and biased toward a generally encouraging range (18-36, out of a
// traditional max of 36) to match the app's positive, entertainment-first
// tone elsewhere (astrologer ratings, etc.) - never scores as a bad match.
function gunaMilanScore(dob1: string, dob2: string): number {
  const hash = hashString([dob1, dob2].sort().join("|"));
  return 18 + (hash % 19);
}

kundliRouter.post("/match", optionalUser, async (req: AuthedRequest, res) => {
  const parsed = matchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { person1Name, person1Dob, person2Name, person2Dob } = parsed.data;

  const score = gunaMilanScore(person1Dob, person2Dob);
  const { text, configured } = await generateKundliMatch({
    person1Name,
    person1Dob,
    person2Name,
    person2Dob,
    score,
  });

  const match = await prisma.kundliMatch.create({
    data: {
      userId: req.user?.sub,
      person1Name,
      person1Dob: new Date(person1Dob),
      person2Name,
      person2Dob: new Date(person2Dob),
      score,
      resultText: text,
    },
  });

  res.status(201).json({ match, aiConfigured: configured });
});

kundliRouter.get("/match/mine", optionalUser, async (req: AuthedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: "Login required" });
  const matches = await prisma.kundliMatch.findMany({
    where: { userId: req.user.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ matches });
});
