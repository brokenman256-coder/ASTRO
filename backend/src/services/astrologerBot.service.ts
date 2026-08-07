import { prisma } from "../lib/prisma";
import { generateHeadshotDataUri } from "../lib/imageGen";

const SPECIALTIES = [
  "Vedic Astrology",
  "Tarot Reading",
  "Numerology",
  "Palmistry",
  "Vastu Shastra",
  "KP Astrology",
  "Western Astrology",
  "Face Reading",
  "Marriage & Relationships",
  "Career & Finance",
];

const FIRST_NAMES: { name: string; gender: "man" | "woman" }[] = [
  { name: "Aanya", gender: "woman" },
  { name: "Rohan", gender: "man" },
  { name: "Meera", gender: "woman" },
  { name: "Kabir", gender: "man" },
  { name: "Priya", gender: "woman" },
  { name: "Arjun", gender: "man" },
  { name: "Ishita", gender: "woman" },
  { name: "Dev", gender: "man" },
  { name: "Tara", gender: "woman" },
  { name: "Vikram", gender: "man" },
  { name: "Naina", gender: "woman" },
  { name: "Aditya", gender: "man" },
  { name: "Sana", gender: "woman" },
  { name: "Rahul", gender: "man" },
  { name: "Zara", gender: "woman" },
  { name: "Kunal", gender: "man" },
];

const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Rao", "Kapoor", "Mehta", "Nair", "Gupta",
  "Chawla", "Reddy", "Joshi", "Bhat",
];

const BIO_TEMPLATES = [
  "brings {years} years of experience in {specialty}, known for precise, compassionate readings.",
  "has guided thousands of clients through {specialty}, blending traditional wisdom with modern insight.",
  "specializes in {specialty} with a calm, practical approach that clients trust for life's big decisions.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAstrologerProfile() {
  const first = pick(FIRST_NAMES);
  const last = pick(LAST_NAMES);
  const specialty = pick(SPECIALTIES);
  const experienceYears = 3 + Math.floor(Math.random() * 20);
  const rating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
  const bioTemplate = pick(BIO_TEMPLATES)
    .replace("{years}", String(experienceYears))
    .replace("{specialty}", specialty);
  const name = `${first.name} ${last}`;
  const age = 27 + experienceYears;
  return {
    name,
    gender: first.gender,
    age,
    specialty,
    experienceYears,
    rating,
    bio: `${name} ${bioTemplate}`,
    fallbackPhotoUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(name)}`,
  };
}

function buildHeadshotPrompt(gender: "man" | "woman", age: number, specialty: string): string {
  return `Professional photorealistic headshot portrait of a South Asian ${gender} astrologer, ` +
    `around ${age} years old, warm and confident expression, wearing smart business-casual attire, ` +
    `soft studio lighting, neutral gray background, high quality DSLR photo, looking directly at ` +
    `the camera, shot in the style of a professional consultant's profile photo. No text, no logos.`;
}

/**
 * Bot action: adds one freshly generated astrologer to the live roster,
 * with a real AI-generated photorealistic headshot when OPENAI_API_KEY is
 * configured (falls back to a placeholder avatar otherwise).
 */
export async function botAddAstrologer() {
  const { fallbackPhotoUrl, gender, age, ...profile } = generateAstrologerProfile();

  let photoUrl = fallbackPhotoUrl;
  try {
    const generated = await generateHeadshotDataUri(
      buildHeadshotPrompt(gender, age, profile.specialty)
    );
    if (generated) photoUrl = generated;
  } catch (err) {
    console.error("Headshot generation failed, using fallback avatar:", err);
  }

  return prisma.astrologer.create({
    data: { ...profile, photoUrl, source: "BOT", active: true },
  });
}

/**
 * Bot action: retires astrologers that are stale by the given policy -
 * lowest-rated first, optionally scoped to bot-created profiles only.
 * Retiring sets active=false rather than deleting, preserving history.
 */
export async function botPruneAstrologers(opts: { maxToRetire?: number; minRating?: number } = {}) {
  const maxToRetire = opts.maxToRetire ?? 1;
  const minRating = opts.minRating ?? 4.0;

  const candidates = await prisma.astrologer.findMany({
    where: { active: true, rating: { lt: minRating } },
    orderBy: { rating: "asc" },
    take: maxToRetire,
  });

  if (candidates.length === 0) return [];

  await prisma.astrologer.updateMany({
    where: { id: { in: candidates.map((c) => c.id) } },
    data: { active: false, retiredAt: new Date() },
  });

  return candidates;
}

/**
 * Retires the single oldest-by-lowest-rating active bot profile regardless
 * of rating threshold - used to make room under a roster size cap.
 */
export async function botRetireOldestForCap() {
  const oldest = await prisma.astrologer.findFirst({
    where: { active: true },
    orderBy: [{ rating: "asc" }, { createdAt: "asc" }],
  });
  if (!oldest) return null;
  await prisma.astrologer.update({
    where: { id: oldest.id },
    data: { active: false, retiredAt: new Date() },
  });
  return oldest;
}
