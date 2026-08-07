import { prisma } from "./prisma";
import { botAddAstrologer, botRetireOldestForCap } from "../services/astrologerBot.service";

const TICK_MS = 60 * 1000;

async function runIfDue() {
  const settings = await prisma.astrologerBotSettings.upsert({
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
    const activeCount = await prisma.astrologer.count({ where: { active: true } });
    if (activeCount >= settings.maxActiveAstrologers) {
      await botRetireOldestForCap();
    }
    await botAddAstrologer();
  } catch (err) {
    console.error("Astrologer auto-bot run failed:", err);
  } finally {
    await prisma.astrologerBotSettings.update({
      where: { id: 1 },
      data: { lastRunAt: new Date() },
    });
  }
}

export function startAstrologerScheduler() {
  setInterval(() => {
    runIfDue().catch((err) => console.error("Astrologer scheduler tick failed:", err));
  }, TICK_MS);
  // Also check shortly after boot rather than waiting a full tick.
  setTimeout(() => {
    runIfDue().catch((err) => console.error("Astrologer scheduler initial run failed:", err));
  }, 5000);
}
