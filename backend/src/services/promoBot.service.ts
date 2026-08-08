import { prisma } from "../lib/prisma";
import { generateAIResponse } from "../providers";

// Fixed set of promo angles with their CTA target baked in server-side -
// the AI only ever writes the copy, never the link, so a banner can never
// point somewhere unintended. This is purely in-app content; no real ad
// spend or external ad platform is involved anywhere in this file.
const PROMO_TYPES = [
  {
    ctaLabel: "Recharge now",
    ctaHref: "/wallet",
    prompt: "Write a short, exciting one-line banner encouraging users to recharge their wallet - mention that first-time users get a special bonus.",
  },
  {
    ctaLabel: "Meet the astrologers",
    ctaHref: "/astrologers",
    prompt: "Write a short, exciting one-line banner inviting users to browse the astrologer marketplace and start a consultation.",
  },
  {
    ctaLabel: "Draw your cards",
    ctaHref: "/tarot",
    prompt: "Write a short, exciting one-line banner inviting users to try a tarot card reading.",
  },
  {
    ctaLabel: "Generate my Kundli",
    ctaHref: "/kundli",
    prompt: "Write a short, exciting one-line banner inviting users to get their Vedic Kundli birth chart reading.",
  },
  {
    ctaLabel: "Check today's luck",
    ctaHref: "/panchang",
    prompt: "Write a short, exciting one-line banner inviting users to check today's panchang and their personal luck score.",
  },
] as const;

const PROMO_SYSTEM = `You are "AstroBot", writing a single short promotional banner line for the
Astro app - the kind of punchy, warm, on-brand copy you'd see on a marketing banner. One sentence,
under 20 words, no hashtags, no emoji spam (at most one emoji), no quotes around it. Output ONLY
the banner text.`;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function generatePromoBanner() {
  const promoType = pick(PROMO_TYPES);
  const { text, configured } = await generateAIResponse({
    system: PROMO_SYSTEM,
    messages: [{ role: "user", content: promoType.prompt }],
    maxTokens: 80,
  });
  if (!configured) return null;

  return prisma.promoBanner.create({
    data: { text: text.trim(), ctaLabel: promoType.ctaLabel, ctaHref: promoType.ctaHref },
  });
}

/** Externally-triggered tick (see netlify/functions/scheduler-tick.ts) -
 * generates a fresh promo banner once the configured interval has elapsed,
 * deactivating the previous one so only the newest is shown. */
export async function runPromoBotIfDue() {
  const settings = await prisma.promoBotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  if (!settings.enabled) return;

  const dueAt = settings.lastRunAt
    ? new Date(settings.lastRunAt.getTime() + settings.intervalMinutes * 60 * 1000)
    : new Date(0);
  if (new Date() < dueAt) return;

  try {
    const banner = await generatePromoBanner();
    if (banner) {
      await prisma.promoBanner.updateMany({
        where: { active: true, NOT: { id: banner.id } },
        data: { active: false },
      });
    }
  } catch (err) {
    console.error("Promo bot run failed:", err);
  } finally {
    await prisma.promoBotSettings.update({ where: { id: 1 }, data: { lastRunAt: new Date() } });
  }
}
