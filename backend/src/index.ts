import express from "express";
import { env } from "./lib/env";
import { createApp } from "./app";
import { startAstrologerScheduler } from "./lib/astrologerScheduler";

// Used for local dev and any persistent-server deployment (e.g. Render).
// Mounts the shared app under /api so routes match the same
// NEXT_PUBLIC_API_URL=".../api" convention the frontend always uses,
// regardless of which entry point (this one, or the Netlify function) is
// actually serving the request.
const root = express();
root.use("/api", createApp());

root.listen(env.port, () => {
  console.log(`Astro backend listening on port ${env.port}`);
  startAstrologerScheduler();
});
