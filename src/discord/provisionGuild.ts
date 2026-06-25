import { PermissionFlagsBits, type Guild } from "discord.js";
import type { Blueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { Logger } from "../utils/logger";
import { ensureAutomodRules } from "./automod";
import { ensureCategoriesAndChannels } from "./channels";
import { ensureStarterMessages } from "./messages";
import { logOnboardingManualFallback } from "./onboarding";
import { ensureRoles } from "./roles";
import { createProvisionSummary, type ProvisionSummary } from "./types";
import { ensureWebhooks } from "./webhooks";

function warnMissingPermissions(guild: Guild, logger: Logger): void {
  const me = guild.members.me;
  if (!me) {
    logger.warn("Could not inspect the bot member permissions.");
    return;
  }

  const required = [
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageWebhooks,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ViewAuditLog
  ];
  const missing = required.filter((permission) => !me.permissions.has(permission));

  if (missing.length > 0) {
    logger.warn("The bot is missing one or more recommended permissions. Setup may partially fail.", missing.map(String));
  }

  logger.info(`Bot highest role position: ${me.roles.highest.position}. Keep the bot role above roles it should manage.`);
}

export async function provisionGuild(
  guild: Guild,
  blueprint: Blueprint,
  stateManager: StateManager,
  logger: Logger
): Promise<ProvisionSummary> {
  const summary = createProvisionSummary();
  await stateManager.setGuildId(guild.id);
  warnMissingPermissions(guild, logger);

  const roleIds = await ensureRoles(guild, blueprint.roles, stateManager, summary, logger);
  const channelIds = await ensureCategoriesAndChannels(guild, blueprint, stateManager, roleIds, summary, logger);
  await ensureStarterMessages(guild, blueprint, stateManager, summary, logger);
  await ensureWebhooks(guild, blueprint, stateManager, summary, logger);
  await ensureAutomodRules(guild, blueprint, stateManager, roleIds, channelIds, summary, logger);
  logOnboardingManualFallback(blueprint, summary, logger);
  await stateManager.save();

  return summary;
}
