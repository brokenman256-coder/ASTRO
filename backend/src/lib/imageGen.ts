import OpenAI from "openai";
import { env } from "./env";

let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (!env.openaiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: env.openaiApiKey });
  return client;
}

/**
 * Generates a realistic human headshot portrait and returns it as a base64
 * data URI, ready to store directly in the DB (no expiring external URL).
 * Returns null when OPENAI_API_KEY isn't configured - callers should fall
 * back to a placeholder avatar rather than fail.
 */
export async function generateHeadshotDataUri(prompt: string): Promise<string | null> {
  const openai = getClient();
  if (!openai) return null;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
    response_format: "b64_json",
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) return null;
  return `data:image/png;base64,${b64}`;
}
