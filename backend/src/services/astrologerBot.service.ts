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
  "Nadi Astrology",
  "Lal Kitab",
  "Gemstone Therapy",
  "Horary Astrology",
];

const FIRST_NAMES: { name: string; gender: "man" | "woman" }[] = [
  { name: "Aanya", gender: "woman" }, { name: "Rohan", gender: "man" },
  { name: "Meera", gender: "woman" }, { name: "Kabir", gender: "man" },
  { name: "Priya", gender: "woman" }, { name: "Arjun", gender: "man" },
  { name: "Ishita", gender: "woman" }, { name: "Dev", gender: "man" },
  { name: "Tara", gender: "woman" }, { name: "Vikram", gender: "man" },
  { name: "Naina", gender: "woman" }, { name: "Aditya", gender: "man" },
  { name: "Sana", gender: "woman" }, { name: "Rahul", gender: "man" },
  { name: "Zara", gender: "woman" }, { name: "Kunal", gender: "man" },
  { name: "Diya", gender: "woman" }, { name: "Aarav", gender: "man" },
  { name: "Ananya", gender: "woman" }, { name: "Vivaan", gender: "man" },
  { name: "Saanvi", gender: "woman" }, { name: "Reyansh", gender: "man" },
  { name: "Aadhya", gender: "woman" }, { name: "Ayaan", gender: "man" },
  { name: "Kiara", gender: "woman" }, { name: "Krishna", gender: "man" },
  { name: "Myra", gender: "woman" }, { name: "Ishaan", gender: "man" },
  { name: "Anika", gender: "woman" }, { name: "Shaurya", gender: "man" },
  { name: "Ira", gender: "woman" }, { name: "Atharv", gender: "man" },
  { name: "Riya", gender: "woman" }, { name: "Advait", gender: "man" },
  { name: "Navya", gender: "woman" }, { name: "Sai", gender: "man" },
  { name: "Pari", gender: "woman" }, { name: "Ansh", gender: "man" },
  { name: "Aditi", gender: "woman" }, { name: "Vihaan", gender: "man" },
  { name: "Sneha", gender: "woman" }, { name: "Rudra", gender: "man" },
  { name: "Pooja", gender: "woman" }, { name: "Yash", gender: "man" },
  { name: "Neha", gender: "woman" }, { name: "Om", gender: "man" },
  { name: "Kavya", gender: "woman" }, { name: "Aryan", gender: "man" },
  { name: "Ritika", gender: "woman" }, { name: "Dhruv", gender: "man" },
  { name: "Simran", gender: "woman" }, { name: "Karthik", gender: "man" },
  { name: "Trisha", gender: "woman" }, { name: "Nikhil", gender: "man" },
  { name: "Mahi", gender: "woman" }, { name: "Siddharth", gender: "man" },
  { name: "Aarohi", gender: "woman" }, { name: "Varun", gender: "man" },
  { name: "Vanya", gender: "woman" }, { name: "Manav", gender: "man" },
  { name: "Nitya", gender: "woman" }, { name: "Harsh", gender: "man" },
  { name: "Shreya", gender: "woman" }, { name: "Raghav", gender: "man" },
  { name: "Rhea", gender: "woman" }, { name: "Tanmay", gender: "man" },
  { name: "Isha", gender: "woman" }, { name: "Abhinav", gender: "man" },
];

const LAST_NAMES = [
  "Sharma", "Verma", "Iyer", "Rao", "Kapoor", "Mehta", "Nair", "Gupta",
  "Chawla", "Reddy", "Joshi", "Bhat", "Agarwal", "Bose", "Chatterjee",
  "Desai", "Dutta", "Ghosh", "Kulkarni", "Malhotra", "Mishra", "Menon",
  "Nayar", "Pillai", "Pandey", "Patel", "Rastogi", "Saxena", "Sinha",
  "Trivedi", "Yadav", "Chopra", "Bhalla", "Khurana", "Ahluwalia",
  "Bajaj", "Chandra", "Dhawan", "Grover", "Handa",
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
 * One-time bulk creation of many astrologer profiles at once (e.g. seeding
 * 1000 up front), using the placeholder avatar rather than paid AI headshot
 * generation - generating that many real images would cost real money per
 * image and isn't worth it for a bulk pool where only a rotating subset is
 * shown at a time (see the daily-featured-100 logic on the public listing).
 * Names are deduped across the batch so profiles don't look copy-pasted.
 */
export async function bulkSeedAstrologers(count: number) {
  const usedNames = new Set<string>();
  const records: Array<{
    name: string;
    specialty: string;
    experienceYears: number;
    rating: number;
    bio: string;
    photoUrl: string;
    source: "BOT";
    active: boolean;
  }> = [];

  let attempts = 0;
  const maxAttempts = count * 6;
  while (records.length < count && attempts < maxAttempts) {
    attempts++;
    const { fallbackPhotoUrl, gender, age, ...profile } = generateAstrologerProfile();
    void gender;
    void age;
    if (usedNames.has(profile.name)) continue;
    usedNames.add(profile.name);
    records.push({ ...profile, photoUrl: fallbackPhotoUrl, source: "BOT", active: true });
  }

  if (records.length > 0) {
    await prisma.astrologer.createMany({ data: records });
  }
  return records.length;
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
