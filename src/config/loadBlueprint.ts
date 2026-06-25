import { readFile } from "node:fs/promises";
import YAML from "yaml";
import { assertValidBlueprint } from "../blueprint/validateBlueprint";
import type { Blueprint } from "../blueprint/schema";

export async function loadBlueprint(path: string): Promise<Blueprint> {
  const raw = await readFile(path, "utf8");
  const data = path.endsWith(".json") ? JSON.parse(raw) : YAML.parse(raw);
  return assertValidBlueprint(data);
}
