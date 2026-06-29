#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { generateBlueprint, generateBlueprintWithoutAi } from "./ai/blueprintGenerator";
import { validateBlueprint } from "./blueprint/validateBlueprint";
import { loadBlueprint } from "./config/loadBlueprint";
import { loadEnv, requireDiscordEnv } from "./config/loadEnv";
import { saveBlueprint } from "./config/saveBlueprint";
import { createDiscordClient, fetchConfiguredGuild } from "./discord/client";
import { provisionGuild } from "./discord/provisionGuild";
import { diffBlueprintAgainstState } from "./dryRun/diff";
import { printPlan } from "./dryRun/printPlan";
import { StateManager } from "./state/stateManager";
import { Logger } from "./utils/logger";

interface ParsedArgs {
  command: string;
  positional: string[];
  options: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "help", ...rest] = argv;
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg) continue;

    if (arg.startsWith("--")) {
      const [rawKey = "", inlineValue] = arg.slice(2).split("=", 2);
      const key = rawKey.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

      if (inlineValue !== undefined) {
        options[key] = inlineValue;
        continue;
      }

      const next = rest[index + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        index += 1;
      } else {
        options[key] = true;
      }
      continue;
    }

    positional.push(arg);
  }

  return { command, positional, options };
}

function optionString(options: Record<string, string | boolean>, key: string): string | undefined {
  const value = options[key];
  return typeof value === "string" ? value : undefined;
}

async function findLatestGeneratedBlueprint(): Promise<string | undefined> {
  const dir = "blueprints/generated";
  try {
    const names = await readdir(dir);
    const candidates = await Promise.all(
      names
        .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".json"))
        .map(async (name) => {
          const path = join(dir, name);
          const info = await stat(path);
          return { path, mtimeMs: info.mtimeMs };
        })
    );
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0]?.path;
  } catch {
    return undefined;
  }
}

async function resolveBlueprintPath(options: Record<string, string | boolean>, positional: string[]): Promise<string> {
  const explicit = optionString(options, "blueprint") ?? positional[0];
  if (explicit) {
    return explicit;
  }

  const latest = await findLatestGeneratedBlueprint();
  if (!latest) {
    throw new Error("No blueprint path provided and no generated blueprint was found. Use --blueprint <path>.");
  }

  return latest;
}

function printHelp(): void {
  console.log(`PromptGuild

Commands:
  npm run generate-blueprint -- "<prompt>"
  npm run validate-blueprint -- --blueprint blueprints/generated/example.yml
  npm run setup:dry-run -- --blueprint blueprints/generated/example.yml
  npm run setup -- --blueprint blueprints/generated/example.yml
  npm run reset-state

Options:
  --blueprint <path>  Blueprint file to validate or apply
  --out <path>        Output path for generated blueprint
  --prompt-file <path> Read the generation prompt from a file
  --dry-run           Preview setup without Discord API mutations
  --no-ai             Generate with local heuristics only
`);
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const env = loadEnv();
  const logger = new Logger(env.LOG_LEVEL);
  const stateManager = new StateManager(env.STATE_FILE);

  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  if (args.command === "generate-blueprint") {
    const promptFile = optionString(args.options, "promptFile");
    const prompt = promptFile ? (await readFile(promptFile, "utf8")).trim() : args.positional.join(" ").trim();
    if (!prompt) {
      throw new Error("Provide a natural-language server prompt or --prompt-file <path>.");
    }

    const result = args.options.noAi
      ? generateBlueprintWithoutAi(prompt)
      : await generateBlueprint({ prompt, logger });
    const outputPath = optionString(args.options, "out") ?? join("blueprints/generated", result.suggestedFileName);
    await saveBlueprint(outputPath, result.blueprint);

    console.log(`Detected template: ${result.plan.template}`);
    console.log(`Generated roles: ${result.blueprint.roles.map((role) => role.name).join(", ")}`);
    console.log(`Generated categories: ${result.blueprint.categories.map((category) => category.name).join(", ")}`);
    console.log(`Blueprint saved to ${outputPath}`);
    return;
  }

  if (args.command === "validate-blueprint") {
    const path = await resolveBlueprintPath(args.options, args.positional);
    const blueprint = await loadBlueprint(path);
    const result = validateBlueprint(blueprint);
    if (!result.valid) {
      console.error(`Blueprint is invalid: ${path}`);
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Blueprint is valid: ${path}`);
    return;
  }

  if (args.command === "setup") {
    const path = await resolveBlueprintPath(args.options, args.positional);
    const blueprint = await loadBlueprint(path);
    const dryRun = Boolean(args.options.dryRun) || env.DRY_RUN;

    if (dryRun) {
      const state = await stateManager.load();
      const plan = diffBlueprintAgainstState(blueprint, state);
      printPlan(plan);
      return;
    }

    const { token, guildId } = requireDiscordEnv(env);
    const client = await createDiscordClient(token, logger);
    try {
      const guild = await fetchConfiguredGuild(client, guildId);
      const summary = await provisionGuild(guild, blueprint, stateManager, logger);

      console.log(`Created roles: ${summary.createdRoles}`);
      console.log(`Updated roles: ${summary.updatedRoles}`);
      console.log(`Created categories: ${summary.createdCategories}`);
      console.log(`Created channels: ${summary.createdChannels}`);
      console.log(`Posted messages: ${summary.postedMessages}`);
      console.log(`Created webhooks: ${summary.createdWebhooks}`);
      console.log(`AutoMod rules: ${summary.createdAutomodRules}`);
      console.log(`Setup complete with ${summary.errors.length} errors`);
    } finally {
      client.destroy();
    }
    return;
  }

  if (args.command === "reset-state") {
    await stateManager.reset();
    console.log(`State reset: ${env.STATE_FILE}`);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
