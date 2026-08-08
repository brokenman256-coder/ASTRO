import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp } from "../../src/app";

// Netlify's redirect (see netlify.toml: /api/* -> /.netlify/functions/api/:splat,
// status 200) is a rewrite/proxy, not a browser redirect - the function
// receives the ORIGINAL request path (e.g. "/api/health"), not the rewritten
// target path. So the prefix to strip is "/api", matching what routes are
// actually mounted as in app.ts (no "/api" prefix).
const serverlessHandler = serverless(createApp(), {
  basePath: "/api",
});

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const response = await serverlessHandler(event, context);
  return response as HandlerResponse;
};
