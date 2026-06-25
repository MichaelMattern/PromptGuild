import { systemPrompt } from "./systemPrompt";

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  timeoutMs: number;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
  response?: string;
  error?: string;
}

function stripJsonFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1]?.trim() ?? trimmed : trimmed;
}

export function parseModelJson(content: string): unknown {
  const stripped = stripJsonFence(content);

  try {
    return JSON.parse(stripped);
  } catch {
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
    }

    throw new Error("Model response did not contain valid JSON.");
  }
}

export async function interpretPromptWithOllama(prompt: string, options: OllamaOptions): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  const baseUrl = options.baseUrl.replace(/\/+$/, "");

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: options.model,
        stream: false,
        format: "json",
        options: {
          temperature: 0.2
        },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this Discord server prompt and return only JSON matching the requested fields:\n\n${prompt}`
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama request failed with HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ""}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    if (data.error) {
      throw new Error(data.error);
    }

    const content = data.message?.content ?? data.response;
    if (!content) {
      throw new Error("Ollama returned an empty response.");
    }

    return parseModelJson(content);
  } finally {
    clearTimeout(timeout);
  }
}
