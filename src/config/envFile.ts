import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const managedEnvKeys = [
  "DISCORD_TOKEN",
  "DISCORD_GUILD_ID",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OLLAMA_BASE_URL",
  "OLLAMA_MODEL",
  "OLLAMA_TIMEOUT_MS",
  "DRY_RUN",
  "LOG_LEVEL",
  "STATE_FILE",
  "WEB_PORT",
  "WEB_HOST"
] as const;

export const secretEnvKeys = ["DISCORD_TOKEN", "OPENAI_API_KEY"] as const;

export type ManagedEnvKey = (typeof managedEnvKeys)[number];
export type SecretEnvKey = (typeof secretEnvKeys)[number];
export type EnvUpdates = Partial<Record<ManagedEnvKey, string>>;

const secretKeySet = new Set<string>(secretEnvKeys);

function parseEnvLine(line: string): { key: string; value: string } | undefined {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match?.[1]) {
    return undefined;
  }

  let value = match[2] ?? "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key: match[1], value };
}

function serializeValue(value: string): string {
  if (value === "" || /^[A-Za-z0-9_\-.:/@\\]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function defaultEnvFilePath(): string {
  return process.env.ENV_FILE || ".env";
}

export async function readEnvFile(path = defaultEnvFilePath()): Promise<Record<string, string>> {
  const absolute = resolve(path);
  try {
    const raw = await readFile(absolute, "utf8");
    const values: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (parsed) {
        values[parsed.key] = parsed.value;
      }
    }
    return values;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

export async function updateEnvFile(updates: EnvUpdates, path = defaultEnvFilePath()): Promise<{ path: string; updated: ManagedEnvKey[]; preservedSecrets: SecretEnvKey[] }> {
  const absolute = resolve(path);
  let raw = "";
  try {
    raw = await readFile(absolute, "utf8");
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "ENOENT") {
      throw error;
    }
  }

  const lines = raw ? raw.split(/\r?\n/) : [];
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const pending = new Map<ManagedEnvKey, string>();
  const preservedSecrets: SecretEnvKey[] = [];

  for (const key of managedEnvKeys) {
    if (!(key in updates)) {
      continue;
    }

    const value = updates[key];
    if (value === undefined) {
      continue;
    }

    if (secretKeySet.has(key) && value.trim() === "") {
      preservedSecrets.push(key as SecretEnvKey);
      continue;
    }

    pending.set(key, value.trim());
  }

  const updated: ManagedEnvKey[] = [];
  const output = lines.map((line) => {
    const parsed = parseEnvLine(line);
    if (!parsed || !pending.has(parsed.key as ManagedEnvKey)) {
      return line;
    }

    const key = parsed.key as ManagedEnvKey;
    const value = pending.get(key) ?? "";
    pending.delete(key);
    updated.push(key);
    return `${key}=${serializeValue(value)}`;
  });

  for (const [key, value] of pending) {
    output.push(`${key}=${serializeValue(value)}`);
    updated.push(key);
  }

  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, `${output.join("\n")}\n`, "utf8");

  for (const key of updated) {
    process.env[key] = updates[key];
  }

  return { path: absolute, updated, preservedSecrets };
}
