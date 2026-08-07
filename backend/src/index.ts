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

const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/astrologers", astrologersRouter);
app.use("/api/predictions", predictionsRouter);
app.use("/api/palm-reading", palmReadingRouter);
app.use("/api/wallet", walletRouter);
app.use("/api/branding", brandingRouter);
app.use("/api/bot", botRouter);
app.use("/api/admin", adminRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
  console.log(`Astro backend listening on port ${env.port}`);
});
