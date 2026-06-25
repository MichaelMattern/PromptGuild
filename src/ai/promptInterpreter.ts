import OpenAI from "openai";
import { z } from "zod";
import { loadEnv } from "../config/loadEnv";
import { detectTemplate } from "../blueprint/templates";
import type { TemplateLabel } from "../blueprint/templates";
import type { Logger } from "../utils/logger";
import { interpretPromptWithOllama } from "./ollamaClient";
import { systemPrompt } from "./systemPrompt";

const sensitiveKeywordMap: Record<string, string[]> = {
  finance: ["finance", "investing", "investment", "stock", "stocks", "trading", "trader", "options", "forex"],
  crypto: ["crypto", "bitcoin", "ethereum", "web3", "nft", "wallet"],
  "sports betting": ["sports betting", "betting", "bets", "odds", "parlay", "gambling", "picks"],
  legal: ["legal", "law", "attorney", "compliance"],
  medical: ["medical", "health", "doctor", "therapy", "medicine", "wellness"]
};

export const structuredPlanSchema = z.object({
  originalPrompt: z.string(),
  template: z.string(),
  confidence: z.number().min(0).max(1).default(0.7),
  businessType: z.string().default("community"),
  audience: z.array(z.string()).default(["members"]),
  monetizationModel: z.string().default("none"),
  serverPurpose: z.array(z.string()).default(["community", "announcements", "support"]),
  moderationNeeds: z.array(z.string()).default(["rules", "staff moderation", "automod"]),
  supportNeeds: z.array(z.string()).default([]),
  premiumAccessNeeds: z.array(z.string()).default([]),
  tone: z.string().default("professional"),
  sensitiveTopics: z.array(z.string()).default([]),
  desiredFeatures: z.object({
    supportTickets: z.boolean().default(false),
    premiumRoles: z.boolean().default(false),
    announcementChannels: z.boolean().default(true),
    events: z.boolean().default(false),
    education: z.boolean().default(false),
    gaming: z.boolean().default(false),
    webhooks: z.boolean().default(false),
    onboarding: z.boolean().default(true),
    automod: z.boolean().default(true)
  }),
  keywords: z.array(z.string()).default([])
});

export type StructuredServerPlan = z.infer<typeof structuredPlanSchema>;

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function detectSensitiveTopics(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  return Object.entries(sensitiveKeywordMap)
    .filter(([, keywords]) => includesAny(lower, keywords))
    .map(([topic]) => topic);
}

function inferAudience(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const audience = new Set<string>();

  if (includesAny(lower, ["customer", "user", "saas", "product"])) audience.add("customers");
  if (includesAny(lower, ["student", "course", "class"])) audience.add("students");
  if (includesAny(lower, ["instructor", "teacher"])) audience.add("instructors");
  if (includesAny(lower, ["clan", "gaming", "lfg"])) audience.add("players");
  if (includesAny(lower, ["creator", "influencer", "subscriber"])) audience.add("fans");
  if (includesAny(lower, ["staff", "moderator", "admin"])) audience.add("staff");
  if (audience.size === 0) audience.add("members");

  return [...audience];
}

function inferMonetization(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (includesAny(lower, ["premium", "paid", "membership", "subscriber", "subscription"])) {
    return "free and premium tiers";
  }
  if (includesAny(lower, ["trial"])) {
    return "trial access";
  }
  return "none";
}

function templateToBusinessType(template: TemplateLabel): string {
  return template.replace(" community", "").replace(" server", "").toLowerCase();
}

function summarizeError(error: unknown): Record<string, unknown> {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const candidate = error as { status?: unknown; code?: unknown; type?: unknown; message?: unknown; error?: { message?: unknown; code?: unknown; type?: unknown } };
  return {
    status: candidate.status,
    code: candidate.code ?? candidate.error?.code,
    type: candidate.type ?? candidate.error?.type,
    message: candidate.message ?? candidate.error?.message
  };
}

export function heuristicInterpretPrompt(prompt: string): StructuredServerPlan {
  const lower = prompt.toLowerCase();
  const template = detectTemplate(prompt);
  const sensitiveTopics = detectSensitiveTopics(prompt);
  const premium = includesAny(lower, ["premium", "paid", "member", "subscriber", "subscription", "private"]);
  const support = includesAny(lower, ["support", "help", "ticket", "bug", "feature request", "customer"]);
  const events = includesAny(lower, ["event", "office hours", "tournament", "webinar", "volunteer"]);
  const education = template === "Education/course community" || includesAny(lower, ["course", "student", "assignment", "lesson"]);
  const gaming = template === "Gaming community";

  return structuredPlanSchema.parse({
    originalPrompt: prompt,
    template,
    confidence: 0.7,
    businessType: templateToBusinessType(template),
    audience: inferAudience(prompt),
    monetizationModel: inferMonetization(prompt),
    serverPurpose: [
      "community",
      "announcements",
      support ? "support" : "",
      premium ? "premium access" : "",
      events ? "events" : "",
      education ? "education" : ""
    ].filter(Boolean),
    moderationNeeds: ["staff moderation", "rules", "automod", "moderation log"],
    supportNeeds: support ? ["support requests", "bug reports", "feature requests"] : [],
    premiumAccessNeeds: premium ? ["premium role", "private premium channels"] : [],
    tone: includesAny(lower, ["casual", "fun", "gaming"]) ? "friendly and organized" : "professional",
    sensitiveTopics,
    desiredFeatures: {
      supportTickets: support,
      premiumRoles: premium,
      announcementChannels: true,
      events,
      education,
      gaming,
      webhooks: includesAny(lower, ["webhook", "alerts", "automation", "integration"]),
      onboarding: true,
      automod: true
    },
    keywords: lower.split(/[^a-z0-9]+/).filter((word) => word.length > 3).slice(0, 25)
  });
}

async function interpretPromptWithOpenAi(prompt: string, logger?: Logger): Promise<StructuredServerPlan> {
  const env = loadEnv();
  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this Discord server prompt and return JSON matching the requested fields:\n\n${prompt}`
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty prompt interpretation.");
    }

    const parsed = structuredPlanSchema.safeParse({
      originalPrompt: prompt,
      ...JSON.parse(content)
    });

    if (!parsed.success) {
      logger?.warn("OpenAI interpretation did not match the plan schema. Falling back to local interpretation.", parsed.error.issues);
      return heuristicInterpretPrompt(prompt);
    }

    return parsed.data;
  } catch (error) {
    logger?.warn("OpenAI prompt interpretation failed.", summarizeError(error));
    throw error;
  }
}

async function interpretPromptWithLocalOllama(prompt: string, logger?: Logger): Promise<StructuredServerPlan> {
  const env = loadEnv();
  try {
    const raw = await interpretPromptWithOllama(prompt, {
      baseUrl: env.OLLAMA_BASE_URL,
      model: env.OLLAMA_MODEL,
      timeoutMs: env.OLLAMA_TIMEOUT_MS
    });

    const parsed = structuredPlanSchema.safeParse({
      originalPrompt: prompt,
      ...(typeof raw === "object" && raw !== null ? raw : {})
    });

    if (!parsed.success) {
      logger?.warn("Ollama interpretation did not match the plan schema.", parsed.error.issues);
      throw new Error("Ollama interpretation did not match the plan schema.");
    }

    logger?.info(`Used Ollama model for prompt interpretation: ${env.OLLAMA_MODEL}`);
    return parsed.data;
  } catch (error) {
    logger?.warn("Ollama prompt interpretation failed.", summarizeError(error));
    throw error;
  }
}

export async function interpretPrompt(prompt: string, logger?: Logger): Promise<StructuredServerPlan> {
  const env = loadEnv();

  if (env.AI_PROVIDER === "local") {
    logger?.info("Using local heuristic prompt interpretation.");
    return heuristicInterpretPrompt(prompt);
  }

  if (env.AI_PROVIDER === "ollama") {
    try {
      return await interpretPromptWithLocalOllama(prompt, logger);
    } catch {
      logger?.warn("Falling back to local heuristic prompt interpretation.");
      return heuristicInterpretPrompt(prompt);
    }
  }

  if (env.AI_PROVIDER === "openai") {
    if (!env.OPENAI_API_KEY) {
      logger?.warn("AI_PROVIDER=openai but OPENAI_API_KEY is not set. Falling back to local heuristic prompt interpretation.");
      return heuristicInterpretPrompt(prompt);
    }

    try {
      return await interpretPromptWithOpenAi(prompt, logger);
    } catch {
      logger?.warn("Falling back to local heuristic prompt interpretation.");
      return heuristicInterpretPrompt(prompt);
    }
  }

  try {
    return await interpretPromptWithLocalOllama(prompt, logger);
  } catch {
    if (env.OPENAI_API_KEY) {
      try {
        return await interpretPromptWithOpenAi(prompt, logger);
      } catch {
        logger?.warn("Falling back to local heuristic prompt interpretation.");
        return heuristicInterpretPrompt(prompt);
      }
    }

    logger?.warn("No working AI provider found. Falling back to local heuristic prompt interpretation.");
    return heuristicInterpretPrompt(prompt);
  }
}
