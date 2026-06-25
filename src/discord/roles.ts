import type { Guild, Role } from "discord.js";
import type { RoleBlueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { StateFile } from "../state/types";
import type { Logger } from "../utils/logger";
import { roleKey } from "../utils/resourceKeys";
import { permissionsValue } from "./permissions";
import type { ProvisionSummary } from "./types";

function roleColors(color: string) {
  return { primaryColor: color as `#${string}` };
}

function findExistingRole(guild: Guild, state: StateFile, blueprint: RoleBlueprint): Role | undefined {
  const key = roleKey(blueprint.name);
  const stateId = state.roles[key]?.id;
  if (stateId) {
    const byId = guild.roles.cache.get(stateId);
    if (byId) {
      return byId;
    }
  }

  return guild.roles.cache.find((role) => role.name.toLowerCase() === blueprint.name.toLowerCase());
}

function roleChanged(existing: Role, blueprint: RoleBlueprint): boolean {
  const desiredPermissions = permissionsValue(blueprint.permissions);
  return (
    existing.name !== blueprint.name ||
    existing.hexColor.toLowerCase() !== blueprint.color.toLowerCase() ||
    existing.hoist !== blueprint.hoist ||
    existing.mentionable !== blueprint.mentionable ||
    existing.permissions.bitfield !== desiredPermissions
  );
}

export async function ensureRoles(
  guild: Guild,
  roles: RoleBlueprint[],
  stateManager: StateManager,
  summary: ProvisionSummary,
  logger: Logger
): Promise<Map<string, string>> {
  const state = await stateManager.load();
  const roleIds = new Map<string, string>();

  for (const blueprint of roles) {
    const key = roleKey(blueprint.name);

    try {
      const existing = findExistingRole(guild, state, blueprint);
      if (!existing) {
        const created = await guild.roles.create({
          name: blueprint.name,
          colors: roleColors(blueprint.color),
          hoist: blueprint.hoist,
          mentionable: blueprint.mentionable,
          permissions: permissionsValue(blueprint.permissions),
          reason: "DiscordForge server setup"
        });

        logger.info(`Created role: ${blueprint.name}`);
        summary.createdRoles += 1;
        roleIds.set(blueprint.name.toLowerCase(), created.id);
        await stateManager.setRole(key, { id: created.id, name: created.name, updatedAt: new Date().toISOString() });
        continue;
      }

      roleIds.set(blueprint.name.toLowerCase(), existing.id);

      if (roleChanged(existing, blueprint)) {
        await existing.edit({
          name: blueprint.name,
          colors: roleColors(blueprint.color),
          hoist: blueprint.hoist,
          mentionable: blueprint.mentionable,
          permissions: permissionsValue(blueprint.permissions),
          reason: "DiscordForge server setup"
        });
        logger.info(`Updated role: ${blueprint.name}`);
        summary.updatedRoles += 1;
      } else {
        summary.skippedRoles += 1;
      }

      await stateManager.setRole(key, { id: existing.id, name: blueprint.name, updatedAt: new Date().toISOString() });
    } catch (error) {
      const message = `Failed to provision role ${blueprint.name}: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(message);
      summary.errors.push(message);
    }
  }

  for (const blueprint of roles) {
    if (blueprint.position === undefined) {
      continue;
    }

    const id = roleIds.get(blueprint.name.toLowerCase());
    const role = id ? guild.roles.cache.get(id) : undefined;
    if (!role) {
      continue;
    }

    try {
      await role.setPosition(blueprint.position, { reason: "DiscordForge role hierarchy" });
    } catch (error) {
      logger.warn(`Could not set role position for ${blueprint.name}. Check the bot role hierarchy.`, error);
    }
  }

  return roleIds;
}
