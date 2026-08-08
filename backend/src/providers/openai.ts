import type { AIProvider, GenerateRequest, GenerateResult } from "./types";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export const openaiProvider: AIProvider = {
  async generateResponse(req: GenerateRequest): Promise<GenerateResult> {
    const baseUrl = (req.apiUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${req.apiKey}`,
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
