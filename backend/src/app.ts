import express from "express";
import cors from "cors";
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

// Route mounts intentionally have no "/api" prefix here - both entry points
// (index.ts for a persistent server, netlify/functions/api.ts for
// serverless) put that prefix back: index.ts's callers already hit
// "/api/..." directly, and the Netlify redirect strips "/api" before
// handing off to the function, which strips its own function-path prefix
// down to exactly what's mounted here.
export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

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
  app.use("/chat", chatRouter);
  app.use("/conversations", conversationsRouter);
  app.use("/admin/ai-settings", adminAIRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
