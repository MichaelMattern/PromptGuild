import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import YAML from "yaml";
import { generateBlueprint, generateBlueprintWithoutAi } from "../ai/blueprintGenerator";
import { validateBlueprint } from "../blueprint/validateBlueprint";
import type { Blueprint } from "../blueprint/schema";
import { loadBlueprint } from "../config/loadBlueprint";
import { managedEnvKeys, readEnvFile, secretEnvKeys, updateEnvFile, type EnvUpdates, type ManagedEnvKey } from "../config/envFile";
import { loadEnv, requireDiscordEnv } from "../config/loadEnv";
import { saveBlueprint } from "../config/saveBlueprint";
import { createDiscordClient, fetchConfiguredGuild } from "../discord/client";
import { provisionGuild } from "../discord/provisionGuild";
import { diffBlueprintAgainstState } from "../dryRun/diff";
import { StateManager } from "../state/stateManager";
import { Logger } from "../utils/logger";
import { slugify } from "../utils/slugify";

const workspaceRoot = process.cwd();
const webRoot = resolve(workspaceRoot, "web");
const blueprintRoot = resolve(workspaceRoot, "blueprints");
const generatedRoot = resolve(blueprintRoot, "generated");
const examplesRoot = resolve(blueprintRoot, "examples");
const templatesRoot = resolve(blueprintRoot, "templates");
type BlueprintFileType = "generated" | "example" | "template";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

interface ApiError extends Error {
  statusCode?: number;
}

function apiError(message: string, statusCode = 400): ApiError {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  return error;
}

function isInside(parent: string, child: string): boolean {
  const relative = child.slice(parent.length);
  return child === parent || (child.startsWith(parent) && relative.startsWith(sep));
}

function safeBlueprintPath(input: string): string {
  const normalized = input.replaceAll("\\", "/");
  const absolute = resolve(workspaceRoot, normalized);
  if (!isInside(blueprintRoot, absolute)) {
    throw apiError("Blueprint path must stay inside the blueprints directory.", 400);
  }

  if (!/\.(ya?ml|json)$/i.test(absolute)) {
    throw apiError("Blueprint path must end in .yml, .yaml, or .json.", 400);
  }

  return absolute;
}

function inferWritableBlueprintType(path: string): Exclude<BlueprintFileType, "example"> | undefined {
  if (isInside(templatesRoot, path)) return "template";
  if (isInside(generatedRoot, path)) return "generated";
  return undefined;
}

function blueprintFileName(name: string | undefined, fallback: string): string {
  const slug = slugify(name?.trim() || fallback);
  return `${slug || slugify(fallback) || "blueprint"}.yml`;
}

function writableBlueprintPath(input: {
  path?: string;
  kind?: Exclude<BlueprintFileType, "example">;
  name?: string;
  fallbackName: string;
}): string {
  const requested = input.path ? safeBlueprintPath(input.path) : undefined;
  const kind = input.kind ?? (requested ? inferWritableBlueprintType(requested) : undefined) ?? "generated";
  const root = kind === "template" ? templatesRoot : generatedRoot;

  if (requested && isInside(root, requested) && !input.name?.trim()) {
    return requested;
  }

  return join(root, blueprintFileName(input.name, input.fallbackName));
}

function workspaceRelative(path: string): string {
  return path.replace(workspaceRoot + sep, "").replaceAll("\\", "/");
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 2_000_000) {
      throw apiError("Request body is too large.", 413);
    }
    chunks.push(buffer);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

function sendJson(response: ServerResponse, payload: unknown, statusCode = 200): void {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

function sendError(response: ServerResponse, error: unknown): void {
  const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 500;
  const message = error instanceof Error ? error.message : String(error);
  sendJson(response, { ok: false, error: message }, Number.isFinite(statusCode) ? statusCode : 500);
}

function parseBlueprintContent(content: string, path = "blueprint.yml"): unknown {
  return path.endsWith(".json") ? JSON.parse(content) : YAML.parse(content);
}

async function blueprintFromPayload(payload: { path?: string; content?: string }): Promise<{ blueprint: Blueprint; path?: string; content?: string }> {
  if (payload.content) {
    const parsed = parseBlueprintContent(payload.content, payload.path ?? "blueprint.yml");
    const result = validateBlueprint(parsed);
    if (!result.valid || !result.blueprint) {
      throw apiError(`Invalid blueprint: ${result.errors.join("; ")}`, 422);
    }

    return { blueprint: result.blueprint, path: payload.path, content: payload.content };
  }

  if (!payload.path) {
    throw apiError("Blueprint path or content is required.");
  }

  const path = safeBlueprintPath(payload.path);
  return { blueprint: await loadBlueprint(path), path: workspaceRelative(path) };
}

function summarizeBlueprint(blueprint: Blueprint) {
  const channels = blueprint.categories.flatMap((category) => category.channels);
  const starterMessages = channels.flatMap((channel) => channel.starterMessages);
  const webhooks = channels.flatMap((channel) => channel.webhooks);
  return {
    serverName: blueprint.server.name,
    communityType: blueprint.server.communityType,
    roles: blueprint.roles.length,
    categories: blueprint.categories.length,
    channels: channels.length,
    starterMessages: starterMessages.length,
    automodRules: blueprint.automod.rules.length,
    webhooks: webhooks.length,
    onboardingQuestions: blueprint.onboarding.questions.length,
    features: blueprint.features,
    tree: blueprint.categories.map((category) => ({
      name: category.name,
      channels: category.channels.map((channel) => ({ name: channel.name, type: channel.type }))
    }))
  };
}

async function listBlueprintDir(root: string, type: BlueprintFileType) {
  await mkdir(root, { recursive: true });
  const names = await readdir(root);
  const files = await Promise.all(
    names
      .filter((name) => /\.(ya?ml|json)$/i.test(name))
      .map(async (name) => {
        const fullPath = join(root, name);
        const info = await stat(fullPath);
        return {
          name,
          path: workspaceRelative(fullPath),
          type,
          updatedAt: info.mtime.toISOString(),
          size: info.size
        };
      })
  );
  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function checkOllama(baseUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, { signal: controller.signal });
    if (!response.ok) {
      return { available: false, status: response.status, models: [] };
    }
    const data = (await response.json()) as { models?: Array<{ name?: string }> };
    return {
      available: true,
      status: response.status,
      models: (data.models ?? []).map((model) => model.name).filter(Boolean)
    };
  } catch (error) {
    return { available: false, error: error instanceof Error ? error.message : String(error), models: [] };
  } finally {
    clearTimeout(timeout);
  }
}

function currentEnvSettings() {
  const env = loadEnv();
  return {
    DISCORD_TOKEN_CONFIGURED: Boolean(env.DISCORD_TOKEN),
    DISCORD_GUILD_ID: env.DISCORD_GUILD_ID ?? "",
    AI_PROVIDER: env.AI_PROVIDER,
    OPENAI_API_KEY_CONFIGURED: Boolean(env.OPENAI_API_KEY),
    OPENAI_MODEL: env.OPENAI_MODEL,
    OLLAMA_BASE_URL: env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: env.OLLAMA_MODEL,
    OLLAMA_TIMEOUT_MS: String(env.OLLAMA_TIMEOUT_MS),
    DRY_RUN: String(env.DRY_RUN),
    LOG_LEVEL: env.LOG_LEVEL,
    STATE_FILE: env.STATE_FILE,
    WEB_PORT: String(env.WEB_PORT),
    WEB_HOST: env.WEB_HOST
  };
}

function sanitizeEnvUpdates(input: Record<string, unknown>): EnvUpdates {
  const updates: EnvUpdates = {};
  const allowed = new Set<string>(managedEnvKeys);

  for (const [key, rawValue] of Object.entries(input)) {
    if (!allowed.has(key)) {
      throw apiError(`Unsupported environment variable: ${key}`, 400);
    }

    const value = typeof rawValue === "string" ? rawValue.trim() : String(rawValue ?? "").trim();
    const envKey = key as ManagedEnvKey;

    if (envKey === "AI_PROVIDER" && !["auto", "openai", "ollama", "local"].includes(value)) {
      throw apiError("AI_PROVIDER must be auto, openai, ollama, or local.", 400);
    }

    if (envKey === "LOG_LEVEL" && !["debug", "info", "warn", "error", "silent"].includes(value)) {
      throw apiError("LOG_LEVEL must be debug, info, warn, error, or silent.", 400);
    }

    if (envKey === "DRY_RUN" && !["true", "false"].includes(value.toLowerCase())) {
      throw apiError("DRY_RUN must be true or false.", 400);
    }

    if (envKey === "WEB_PORT") {
      const port = Number.parseInt(value, 10);
      if (!Number.isInteger(port) || port < 1024 || port > 65535) {
        throw apiError("WEB_PORT must be an integer from 1024 to 65535.", 400);
      }
    }

    if (envKey === "OLLAMA_TIMEOUT_MS") {
      const timeout = Number.parseInt(value, 10);
      if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) {
        throw apiError("OLLAMA_TIMEOUT_MS must be an integer from 1000 to 300000.", 400);
      }
    }

    if ((envKey === "OLLAMA_BASE_URL" || envKey === "WEB_HOST") && value.length === 0) {
      throw apiError(`${envKey} cannot be empty.`, 400);
    }

    updates[envKey] = value;
  }

  return updates;
}

async function handleApi(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  const env = loadEnv();
  const logger = new Logger(env.LOG_LEVEL);
  const stateManager = new StateManager(env.STATE_FILE);

  if (request.method === "GET" && url.pathname === "/api/status") {
    const [generated, templates, examples, ollama] = await Promise.all([
      listBlueprintDir(generatedRoot, "generated"),
      listBlueprintDir(templatesRoot, "template"),
      listBlueprintDir(examplesRoot, "example"),
      checkOllama(env.OLLAMA_BASE_URL)
    ]);

    sendJson(response, {
      ok: true,
      app: "DiscordForge",
      discord: {
        tokenConfigured: Boolean(env.DISCORD_TOKEN),
        guildConfigured: Boolean(env.DISCORD_GUILD_ID)
      },
      ai: {
        provider: env.AI_PROVIDER,
        openaiConfigured: Boolean(env.OPENAI_API_KEY),
        openaiModel: env.OPENAI_MODEL,
        ollamaBaseUrl: env.OLLAMA_BASE_URL,
        ollamaModel: env.OLLAMA_MODEL,
        settingsEditable: true,
        ollama
      },
      web: {
        host: env.WEB_HOST,
        port: env.WEB_PORT
      },
      state: {
        file: env.STATE_FILE,
        loaded: Boolean((await stateManager.load()).updatedAt)
      },
      blueprints: {
        generated,
        templates,
        examples
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/env") {
    const fileValues = await readEnvFile(env.ENV_FILE);
    sendJson(response, {
      ok: true,
      path: env.ENV_FILE,
      settings: currentEnvSettings(),
      file: {
        exists: Object.keys(fileValues).length > 0,
        managedKeys: managedEnvKeys,
        secretKeys: secretEnvKeys
      }
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/env") {
    const payload = await readJsonBody<{ updates?: Record<string, unknown> }>(request);
    const updates = sanitizeEnvUpdates(payload.updates ?? {});
    const previousSettings = currentEnvSettings();
    const result = await updateEnvFile(updates, env.ENV_FILE);
    const nextSettings = currentEnvSettings();
    sendJson(response, {
      ok: true,
      path: workspaceRelative(result.path),
      updated: result.updated,
      preservedSecrets: result.preservedSecrets,
      settings: nextSettings,
      restartRequired:
        (updates.WEB_PORT !== undefined && updates.WEB_PORT !== previousSettings.WEB_PORT) ||
        (updates.WEB_HOST !== undefined && updates.WEB_HOST !== previousSettings.WEB_HOST)
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/blueprints") {
    const [generated, templates, examples] = await Promise.all([
      listBlueprintDir(generatedRoot, "generated"),
      listBlueprintDir(templatesRoot, "template"),
      listBlueprintDir(examplesRoot, "example")
    ]);
    sendJson(response, { ok: true, generated, templates, examples });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/blueprint") {
    const path = url.searchParams.get("path");
    if (!path) throw apiError("path is required.");
    const absolute = safeBlueprintPath(path);
    const content = await readFile(absolute, "utf8");
    const blueprint = await loadBlueprint(absolute);
    sendJson(response, { ok: true, path: workspaceRelative(absolute), content, summary: summarizeBlueprint(blueprint) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate") {
    const payload = await readJsonBody<{ prompt?: string; provider?: string; noAi?: boolean; outputName?: string }>(request);
    const prompt = payload.prompt?.trim();
    if (!prompt) throw apiError("Prompt is required.");

    const previousProvider = process.env.AI_PROVIDER;
    if (payload.provider && ["auto", "ollama", "openai", "local"].includes(payload.provider)) {
      process.env.AI_PROVIDER = payload.provider;
    }

    try {
      const result = payload.noAi || payload.provider === "local" ? generateBlueprintWithoutAi(prompt) : await generateBlueprint({ prompt, logger });
      const fileName = payload.outputName?.trim() ? `${slugify(payload.outputName)}.yml` : result.suggestedFileName;
      const outputPath = join("blueprints", "generated", fileName);
      await saveBlueprint(outputPath, result.blueprint);
      const content = await readFile(outputPath, "utf8");
      sendJson(response, {
        ok: true,
        path: outputPath.replaceAll("\\", "/"),
        plan: result.plan,
        content,
        summary: summarizeBlueprint(result.blueprint)
      });
    } finally {
      if (previousProvider === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = previousProvider;
      }
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/save-blueprint") {
    const payload = await readJsonBody<{ path?: string; content?: string; kind?: "generated" | "template"; name?: string }>(request);
    if (!payload.content) throw apiError("Blueprint content is required.");
    if (payload.kind && !["generated", "template"].includes(payload.kind)) {
      throw apiError("Blueprint save kind must be generated or template.", 400);
    }

    const parsed = parseBlueprintContent(payload.content, payload.path ?? "blueprint.yml");
    const result = validateBlueprint(parsed);
    if (!result.valid || !result.blueprint) {
      sendJson(response, { ok: false, valid: false, errors: result.errors }, 422);
      return;
    }

    const path = writableBlueprintPath({
      path: payload.path,
      kind: payload.kind,
      name: payload.name,
      fallbackName: result.blueprint.server.name || "ui-blueprint"
    });
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, payload.content, "utf8");
    sendJson(response, { ok: true, valid: true, path: workspaceRelative(path), summary: summarizeBlueprint(result.blueprint) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/validate") {
    const payload = await readJsonBody<{ path?: string; content?: string }>(request);
    const { blueprint } = await blueprintFromPayload(payload);
    const result = validateBlueprint(blueprint);
    sendJson(response, { ok: result.valid, valid: result.valid, errors: result.errors, summary: summarizeBlueprint(blueprint) }, result.valid ? 200 : 422);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dry-run") {
    const payload = await readJsonBody<{ path?: string; content?: string }>(request);
    const { blueprint } = await blueprintFromPayload(payload);
    const state = await stateManager.load();
    const plan = diffBlueprintAgainstState(blueprint, state);
    sendJson(response, { ok: true, plan, summary: summarizeBlueprint(blueprint) });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/setup") {
    const payload = await readJsonBody<{ path?: string; content?: string; confirm?: boolean }>(request);
    if (!payload.confirm) throw apiError("Live setup requires confirm=true.", 409);
    const { blueprint } = await blueprintFromPayload(payload);
    const { token, guildId } = requireDiscordEnv(env);
    const client = await createDiscordClient(token, logger);
    try {
      const guild = await fetchConfiguredGuild(client, guildId);
      const summary = await provisionGuild(guild, blueprint, stateManager, logger);
      sendJson(response, { ok: summary.errors.length === 0, summary });
    } finally {
      client.destroy();
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/reset-state") {
    const payload = await readJsonBody<{ confirm?: string }>(request);
    if (payload.confirm !== "RESET") throw apiError('Reset requires confirm="RESET".', 409);
    await stateManager.reset();
    sendJson(response, { ok: true, stateFile: env.STATE_FILE });
    return;
  }

  throw apiError("API route not found.", 404);
}

async function serveStatic(request: IncomingMessage, response: ServerResponse, url: URL): Promise<void> {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const absolute = resolve(webRoot, `.${requested}`);
  if (!isInside(webRoot, absolute)) {
    throw apiError("Not found.", 404);
  }

  const info = await stat(absolute).catch(() => undefined);
  if (!info?.isFile()) {
    throw apiError("Not found.", 404);
  }

  response.writeHead(200, { "Content-Type": contentTypes[extname(absolute)] ?? "application/octet-stream" });
  await new Promise<void>((resolvePromise, reject) => {
    createReadStream(absolute).pipe(response).on("finish", resolvePromise).on("error", reject);
  });
}

export function startWebServer(port = loadEnv().WEB_PORT, host = loadEnv().WEB_HOST): void {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    Promise.resolve()
      .then(() => (url.pathname.startsWith("/api/") ? handleApi(request, response, url) : serveStatic(request, response, url)))
      .catch((error) => sendError(response, error));
  });

  server.listen(port, host, () => {
    console.log(`DiscordForge UI running at http://${host}:${port}`);
  });
}

if (require.main === module) {
  startWebServer();
}
