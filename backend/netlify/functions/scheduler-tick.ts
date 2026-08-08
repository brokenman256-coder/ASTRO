import type { Handler } from "@netlify/functions";
import { env } from "../../src/lib/env";
import { runIfDue } from "../../src/lib/astrologerScheduler";
import { runPromoBotIfDue } from "../../src/services/promoBot.service";

/**
 * Meant to be hit by an external scheduler (e.g. a free cron-job.org ping)
 * every few minutes, since serverless functions have no persistent process
 * to run an in-process timer in. runIfDue() is itself idempotent - it only
 * actually does anything once the configured interval has elapsed - so it's
 * safe to call this far more often than the astrologer bot's own interval.
 */
export const handler: Handler = async (event) => {
  if (env.schedulerSecret) {
    const provided = event.queryStringParameters?.secret;
    if (provided !== env.schedulerSecret) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
    }
  }

  try {
    await runIfDue();
    await runPromoBotIfDue();
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error("scheduler-tick failed:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Tick failed" }) };
  }
};
