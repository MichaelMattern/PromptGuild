import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import YAML from "yaml";
import type { Blueprint } from "../blueprint/schema";

export async function saveBlueprint(path: string, blueprint: Blueprint): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const body = path.endsWith(".json") ? `${JSON.stringify(blueprint, null, 2)}\n` : YAML.stringify(blueprint, { lineWidth: 120 });
  await writeFile(path, body, "utf8");
}
