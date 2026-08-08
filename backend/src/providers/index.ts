import { prisma } from "../lib/prisma";
import { env } from "../lib/env";
import { decryptSecret } from "../lib/secretBox";
import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { compatibleProvider } from "./compatible";
import { localProvider } from "./local";
import type { AIProvider, AITurn, GenerateResult } from "./types";

export type { AITurn, GenerateResult };

const PROVIDERS: Record<string, AIProvider> = {
  anthropic: anthropicProvider,
  openai: openaiProvider,
  compatible: compatibleProvider,
  local: localProvider,
};

export interface ResolvedAISettings {
  provider: string;
  apiUrl: string | null;
  model: string;
  apiKey: string;
  temperature: number;
  maxResponseTokens: number;
  maxMessagesPerSession: number;
  maxSessionMinutes: number;
  maxMessagesPerUserPerDay: number;
  configured: boolean;
}

/** Loads admin AI settings from the DB, decrypts the stored key if present,
 * and falls back to env vars when no key has been configured yet - so the
 * app keeps working with the same graceful "not configured" pattern used
 * elsewhere, rather than hard-failing.
 */
export async function resolveAISettings(): Promise<ResolvedAISettings> {
  const settings = await prisma.adminAISettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });

  let apiKey = "";
  if (settings.encryptedApiKey) {
    apiKey = decryptSecret(settings.encryptedApiKey) ?? "";
  }
  if (!apiKey) {
    apiKey = settings.provider === "anthropic" ? env.anthropicApiKey : env.openaiApiKey;
  }

  return {
    provider: settings.provider,
    apiUrl: settings.apiUrl,
    model: settings.model,
    apiKey,
    temperature: settings.temperature,
    maxResponseTokens: settings.maxResponseTokens,
    maxMessagesPerSession: settings.maxMessagesPerSession,
    maxSessionMinutes: settings.maxSessionMinutes,
    maxMessagesPerUserPerDay: settings.maxMessagesPerUserPerDay,
    configured: Boolean(apiKey),
  };
}

export const AI_NOT_CONFIGURED_MESSAGE =
  "The astrologer is temporarily unavailable. Please try again later.";

/** The single entry point the rest of the backend should call - never
 * import a specific provider module directly outside this file. */
export async function generateAIResponse(params: {
  system: string;
  messages: AITurn[];
  maxTokens?: number;
}): Promise<{ text: string; tokensUsed: number; configured: boolean }> {
  const settings = await resolveAISettings();
  if (!settings.configured) {
    return { text: AI_NOT_CONFIGURED_MESSAGE, tokensUsed: 0, configured: false };
  }

  const provider = PROVIDERS[settings.provider] ?? PROVIDERS.anthropic;
  const result = await provider.generateResponse({
    system: params.system,
    messages: params.messages,
    model: settings.model,
    temperature: settings.temperature,
    maxTokens: params.maxTokens ?? settings.maxResponseTokens,
    apiKey: settings.apiKey,
    apiUrl: settings.apiUrl ?? undefined,
  });
  return { ...result, configured: true };
}
