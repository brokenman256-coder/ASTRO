import type { AIProvider, GenerateRequest, GenerateResult } from "./types";

// Any OpenAI-compatible chat-completions endpoint (OpenRouter, Groq,
// Together, DeepSeek, etc.) - same wire format as openai.ts, but requires
// an explicit apiUrl since there's no sensible default host.

export const compatibleProvider: AIProvider = {
  async generateResponse(req: GenerateRequest): Promise<GenerateResult> {
    if (!req.apiUrl) {
      throw new Error("AI_API_URL is required for the 'compatible' provider");
    }
    const baseUrl = req.apiUrl.replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.apiKey ? { Authorization: `Bearer ${req.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: req.model,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        messages: [
          { role: "system", content: req.system },
          ...req.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`AI provider request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data.usage?.total_tokens ?? 0;
    return { text, tokensUsed };
  },
};
