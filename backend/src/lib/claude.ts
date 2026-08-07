import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";

const MODEL = "claude-sonnet-4-5";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!env.anthropicApiKey) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "The AI prediction engine is not configured yet. Set ANTHROPIC_API_KEY in the backend .env file to enable live AI predictions, palm reading, and bot messaging.";

export async function generateText(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<{ text: string; configured: boolean }> {
  const anthropic = getClient();
  if (!anthropic) {
    return { text: AI_NOT_CONFIGURED_MESSAGE, configured: false };
  }
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 800,
    system: params.system,
    messages: [{ role: "user", content: params.prompt }],
  });
  const block = response.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", configured: true };
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export async function generateConversation(params: {
  system: string;
  turns: ConversationTurn[];
  maxTokens?: number;
}): Promise<{ text: string; configured: boolean }> {
  const anthropic = getClient();
  if (!anthropic) {
    return { text: AI_NOT_CONFIGURED_MESSAGE, configured: false };
  }
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 500,
    system: params.system,
    messages: params.turns.map((t) => ({ role: t.role, content: t.content })),
  });
  const block = response.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", configured: true };
}

export async function generateFromImage(params: {
  system: string;
  prompt: string;
  imageBase64: string;
  mediaType: string;
  maxTokens?: number;
}): Promise<{ text: string; configured: boolean }> {
  const anthropic = getClient();
  if (!anthropic) {
    return { text: AI_NOT_CONFIGURED_MESSAGE, configured: false };
  }
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 900,
    system: params.system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: params.mediaType as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: params.imageBase64,
            },
          },
          { type: "text", text: params.prompt },
        ],
      },
    ],
  });
  const block = response.content.find((c) => c.type === "text");
  return { text: block && block.type === "text" ? block.text : "", configured: true };
}
