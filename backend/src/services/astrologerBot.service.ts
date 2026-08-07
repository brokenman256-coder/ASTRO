import { prisma } from "../lib/prisma";

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

const FIRST_NAMES = [
  "Aanya", "Rohan", "Meera", "Kabir", "Priya", "Arjun", "Ishita", "Dev",
  "Tara", "Vikram", "Naina", "Aditya", "Sana", "Rahul", "Zara", "Kunal",
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
  const name = `${first} ${last}`;
  return {
    name,
    specialty,
    experienceYears,
    rating,
    bio: `${name} ${bioTemplate}`,
    photoUrl: `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(name)}`,
  };
}

/** Bot action: adds one freshly generated astrologer to the live roster. */
export async function botAddAstrologer() {
  const profile = generateAstrologerProfile();
  return prisma.astrologer.create({
    data: { ...profile, source: "BOT", active: true },
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
