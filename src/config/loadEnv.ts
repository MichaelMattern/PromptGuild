import dotenv from "dotenv";
import { z } from "zod";
import { parseLogLevel } from "../utils/logger";

const envFilePath = process.env.ENV_FILE || ".env";

dotenv.config({ path: envFilePath, override: false });
dotenv.config({ path: ".env.local", override: false });

const envSchema = z.object({
  ENV_FILE: z.string().optional().default(envFilePath),
  DISCORD_TOKEN: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  AI_PROVIDER: z.enum(["auto", "openai", "ollama", "local"]).default("auto"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().default("llama3.1:8b"),
  OLLAMA_TIMEOUT_MS: z
    .string()
    .optional()
    .default("30000")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(1000).max(300000)),
  DRY_RUN: z
    .string()
    .optional()
    .default("false")
    .transform((value) => value.toLowerCase() === "true"),
  LOG_LEVEL: z.string().optional().default("info"),
  STATE_FILE: z.string().optional().default(".promptguild/state.json"),
  WEB_PORT: z
    .string()
    .optional()
    .default("5194")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().min(1024).max(65535)),
  WEB_HOST: z.string().optional().default("127.0.0.1")
});

export type AppEnv = ReturnType<typeof loadEnv>;

export function loadEnv() {
  const parsed = envSchema.parse(process.env);
  return {
    ...parsed,
    LOG_LEVEL: parseLogLevel(parsed.LOG_LEVEL)
  };
}

export function requireDiscordEnv(env = loadEnv()): { token: string; guildId: string } {
  if (!env.DISCORD_TOKEN) {
    throw new Error("DISCORD_TOKEN is required for live setup. Add it to .env.");
  }

  if (!env.DISCORD_GUILD_ID) {
    throw new Error("DISCORD_GUILD_ID is required for live setup. Add it to .env.");
  }

  return { token: env.DISCORD_TOKEN, guildId: env.DISCORD_GUILD_ID };
}
