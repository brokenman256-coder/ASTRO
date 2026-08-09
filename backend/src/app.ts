// Must be imported before any router is defined - patches Express so a
// rejected promise inside an async route handler is forwarded to the error
// middleware below instead of becoming an unhandled rejection that crashes
// the whole serverless function (this bit a route that called the AI
// provider without its own try/catch: a provider failure took the entire
// function down with a raw Lambda "Runtime.ExitError" instead of a normal
// JSON error response).
import "express-async-errors";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./lib/env";
import { authRouter } from "./routes/auth.routes";
import { astrologersRouter } from "./routes/astrologers.routes";
import { predictionsRouter } from "./routes/predictions.routes";
import { palmReadingRouter } from "./routes/palmreading.routes";
import { walletRouter } from "./routes/wallet.routes";
import { brandingRouter } from "./routes/branding.routes";
import { botRouter } from "./routes/bot.routes";
import { adminRouter } from "./routes/admin.routes";
import { remediesRouter } from "./routes/remedies.routes";
import { chatRouter } from "./routes/chat.routes";
import { conversationsRouter } from "./routes/conversations.routes";
import { adminAIRouter } from "./routes/adminAI.routes";
import { tarotRouter } from "./routes/tarot.routes";
import { promoRouter } from "./routes/promo.routes";
import { mediaRouter } from "./routes/media.routes";

// Route mounts intentionally have no "/api" prefix here - both entry points
// (index.ts for a persistent server, netlify/functions/api.ts for
// serverless) put that prefix back: index.ts's callers already hit
// "/api/..." directly, and the Netlify redirect strips "/api" before
// handing off to the function, which strips its own function-path prefix
// down to exactly what's mounted here.
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRouter);
  app.use("/astrologers", astrologersRouter);
  app.use("/predictions", predictionsRouter);
  app.use("/palm-reading", palmReadingRouter);
  app.use("/wallet", walletRouter);
  app.use("/branding", brandingRouter);
  app.use("/bot", botRouter);
  app.use("/admin", adminRouter);
  app.use("/remedies", remediesRouter);
  app.use("/tarot", tarotRouter);
  app.use("/promo", promoRouter);
  app.use("/media", mediaRouter);
  app.use("/chat", chatRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/admin/ai-settings", adminAIRouter);

  // Last-resort safety net - any route (including AI provider calls that
  // threw) that didn't handle its own error lands here. Never leaks the
  // technical error to the client, only logs it server-side.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: "Something went wrong. Please try again." });
  });

  return app;
}
