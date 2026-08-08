// Common interface every AI provider adapter implements. The rest of the
// backend (conversation routes, predictions, palm reading, etc.) only ever
// talks to this interface - swapping providers means adding a new file
// here, never touching call sites.

export interface AITurn {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  system: string;
  messages: AITurn[];
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  apiUrl?: string;
}

export interface GenerateResult {
  text: string;
  tokensUsed: number;
}

export interface AIProvider {
  generateResponse(req: GenerateRequest): Promise<GenerateResult>;
}
