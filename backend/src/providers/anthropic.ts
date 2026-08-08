import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateRequest, GenerateResult } from "./types";

export const anthropicProvider: AIProvider = {
  async generateResponse(req: GenerateRequest): Promise<GenerateResult> {
    const client = new Anthropic({ apiKey: req.apiKey });
    const response = await client.messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      system: req.system,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const block = response.content.find((c) => c.type === "text");
    const text = block && block.type === "text" ? block.text : "";
    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);
    return { text, tokensUsed };
  },
};
