import { prisma } from "./prisma";
import { botAddAstrologer, botRetireOldestForCap, botRefreshAstrologerInfo } from "../services/astrologerBot.service";

const TICK_MS = 60 * 1000;

export async function runIfDue() {
  const settings = await prisma.astrologerBotSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  if (settings.enabled) {
    const dueAt = settings.lastRunAt
      ? new Date(settings.lastRunAt.getTime() + settings.intervalMinutes * 60 * 1000)
      : new Date(0);
    if (new Date() >= dueAt) {
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
  }

  if (settings.refreshEnabled) {
    const refreshDueAt = settings.lastRefreshAt
      ? new Date(settings.lastRefreshAt.getTime() + settings.refreshIntervalMinutes * 60 * 1000)
      : new Date(0);
    if (new Date() >= refreshDueAt) {
      try {
        await botRefreshAstrologerInfo(settings.refreshBatchSize);
      } catch (err) {
        console.error("Astrologer info-refresh bot run failed:", err);
      } finally {
        await prisma.astrologerBotSettings.update({
          where: { id: 1 },
          data: { lastRefreshAt: new Date() },
        });
      }
    }
  }
}

/**
 * For persistent-server deployments only (local dev, Render, etc). Not used
 * by the Netlify Functions entry point - serverless functions have no
 * process to keep a timer alive in, so that path relies on an external
 * pinger hitting the scheduler-tick function instead (see netlify/functions
 * /scheduler-tick.ts and the README).
 */
export function startAstrologerScheduler() {
  setInterval(() => {
    runIfDue().catch((err) => console.error("Astrologer scheduler tick failed:", err));
  }, TICK_MS);
  // Also check shortly after boot rather than waiting a full tick.
  setTimeout(() => {
    runIfDue().catch((err) => console.error("Astrologer scheduler initial run failed:", err));
  }, 5000);
}
