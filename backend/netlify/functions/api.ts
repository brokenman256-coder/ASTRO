import type { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import serverless from "serverless-http";
import { createApp } from "../../src/app";

const serverlessHandler = serverless(createApp(), {
  basePath: "/.netlify/functions/api",
});

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const response = await serverlessHandler(event, context);
  return response as HandlerResponse;
};
