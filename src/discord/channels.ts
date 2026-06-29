import { ChannelType, type Guild, type GuildBasedChannel } from "discord.js";
import type { Blueprint, CategoryBlueprint, ChannelBlueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { StateFile } from "../state/types";
import { fingerprint } from "../utils/fingerprint";
import type { Logger } from "../utils/logger";
import { categoryKey, channelKey } from "../utils/resourceKeys";
import { resolvePermissionOverwrites } from "./permissions";
import type { ProvisionSummary } from "./types";

function guildSupportsAnnouncementChannels(guild: Guild): boolean {
  return guild.features.some((feature) => String(feature) === "COMMUNITY");
}

function channelTypeForBlueprint(type: ChannelBlueprint["type"], guild?: Guild): ChannelType {
  if (type === "voice") return ChannelType.GuildVoice;
  if (type === "forum") return ChannelType.GuildForum;
  if (type === "announcement") {
    return guild && !guildSupportsAnnouncementChannels(guild) ? ChannelType.GuildText : ChannelType.GuildAnnouncement;
  }
  return ChannelType.GuildText;
}

function channelTypeLabel(type: ChannelType): ChannelBlueprint["type"] | "category" {
  if (type === ChannelType.GuildVoice) return "voice";
  if (type === ChannelType.GuildForum) return "forum";
  if (type === ChannelType.GuildAnnouncement) return "announcement";
  if (type === ChannelType.GuildCategory) return "category";
  return "text";
}

function findExistingCategory(guild: Guild, state: StateFile, category: CategoryBlueprint): GuildBasedChannel | undefined {
  const key = categoryKey(category.name);
  const stateId = state.categories[key]?.id;
  if (stateId) {
    const byId = guild.channels.cache.get(stateId);
    if (byId?.type === ChannelType.GuildCategory) {
      return byId;
    }
  }

  return guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name.toLowerCase() === category.name.toLowerCase());
}

function findExistingChannel(guild: Guild, state: StateFile, channel: ChannelBlueprint): GuildBasedChannel | undefined {
  const key = channelKey(channel.name);
  const stateId = state.channels[key]?.id;
  if (stateId) {
    const byId = guild.channels.cache.get(stateId);
    if (byId) {
      return byId;
    }
  }

  const desiredType = channelTypeForBlueprint(channel.type, guild);
  return guild.channels.cache.find((existing) => existing.type === desiredType && existing.name.toLowerCase() === channel.name.toLowerCase());
}

function createChannelPayload(guild: Guild, channelBlueprint: ChannelBlueprint, parentId: string | undefined, overwrites: unknown) {
  const type = channelTypeForBlueprint(channelBlueprint.type, guild);
  const payload: Record<string, unknown> = {
    name: channelBlueprint.name,
    type,
    parent: parentId,
    permissionOverwrites: overwrites,
    reason: "PromptGuild server setup"
  };

  if (type !== ChannelType.GuildVoice) {
    payload.topic = channelBlueprint.topic;
    payload.rateLimitPerUser = channelBlueprint.slowmodeSeconds;
    payload.nsfw = channelBlueprint.nsfw;
  }

  return payload;
}

function editChannelPayload(guild: Guild, channelBlueprint: ChannelBlueprint, parentId: string | undefined, overwrites: unknown) {
  const type = channelTypeForBlueprint(channelBlueprint.type, guild);
  const payload: Record<string, unknown> = {
    name: channelBlueprint.name,
    parent: parentId,
    permissionOverwrites: overwrites,
    reason: "PromptGuild server setup"
  };

  if (type !== ChannelType.GuildVoice) {
    payload.topic = channelBlueprint.topic;
    payload.rateLimitPerUser = channelBlueprint.slowmodeSeconds;
    payload.nsfw = channelBlueprint.nsfw;
  }

  return payload;
}

async function ensureCategory(
  guild: Guild,
  categoryBlueprint: CategoryBlueprint,
  state: StateFile,
  stateManager: StateManager,
  roleIds: Map<string, string>,
  summary: ProvisionSummary,
  logger: Logger
): Promise<string | undefined> {
  const key = categoryKey(categoryBlueprint.name);
  const desiredFingerprint = fingerprint({
    name: categoryBlueprint.name,
    permissions: categoryBlueprint.permissions
  });

  try {
    const overwrites = resolvePermissionOverwrites(guild, categoryBlueprint.permissions, roleIds);
    const existing = findExistingCategory(guild, state, categoryBlueprint);
    if (!existing) {
      const created = await guild.channels.create({
        name: categoryBlueprint.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: overwrites,
        reason: "PromptGuild server setup"
      });

      logger.info(`Created category: ${categoryBlueprint.name}`);
      summary.createdCategories += 1;
      await stateManager.setCategory(key, {
        id: created.id,
        name: created.name,
        type: "category",
        fingerprint: desiredFingerprint,
        updatedAt: new Date().toISOString()
      });
      return created.id;
    }

    if (state.categories[key]?.fingerprint === desiredFingerprint && existing.name === categoryBlueprint.name) {
      summary.skippedCategories += 1;
      return existing.id;
    }

    await existing.edit({
      name: categoryBlueprint.name,
      permissionOverwrites: overwrites,
      reason: "PromptGuild server setup"
    });
    logger.info(`Updated category: ${categoryBlueprint.name}`);
    summary.updatedCategories += 1;
    await stateManager.setCategory(key, {
      id: existing.id,
      name: categoryBlueprint.name,
      type: "category",
      fingerprint: desiredFingerprint,
      updatedAt: new Date().toISOString()
    });
    return existing.id;
  } catch (error) {
    const message = `Failed to provision category ${categoryBlueprint.name}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(message);
    summary.errors.push(message);
    return undefined;
  }
}

async function ensureChannel(
  guild: Guild,
  channelBlueprint: ChannelBlueprint,
  parentId: string | undefined,
  state: StateFile,
  stateManager: StateManager,
  roleIds: Map<string, string>,
  summary: ProvisionSummary,
  logger: Logger
): Promise<string | undefined> {
  const key = channelKey(channelBlueprint.name);
  const effectiveType = channelTypeForBlueprint(channelBlueprint.type, guild);
  const desiredFingerprint = fingerprint({
    name: channelBlueprint.name,
    type: channelTypeLabel(effectiveType),
    parentId,
    topic: channelBlueprint.topic,
    slowmodeSeconds: channelBlueprint.slowmodeSeconds,
    nsfw: channelBlueprint.nsfw,
    permissions: channelBlueprint.permissions
  });

  try {
    const overwrites = channelBlueprint.permissions.length
      ? resolvePermissionOverwrites(guild, channelBlueprint.permissions, roleIds)
      : undefined;
    const existing = findExistingChannel(guild, state, channelBlueprint);

    if (!existing) {
      if (channelBlueprint.type === "announcement" && effectiveType === ChannelType.GuildText) {
        logger.warn(`Server does not support announcement channel type for ${channelBlueprint.name}; creating a text channel instead.`);
      }

      const created = await guild.channels.create(createChannelPayload(guild, channelBlueprint, parentId, overwrites) as never);

      logger.info(`Created channel: ${channelBlueprint.name}`);
      summary.createdChannels += 1;
      await stateManager.setChannel(key, {
        id: created.id,
        name: created.name,
        parentId,
        type: channelTypeLabel(created.type),
        fingerprint: desiredFingerprint,
        updatedAt: new Date().toISOString()
      });
      return created.id;
    }

    if (state.channels[key]?.fingerprint === desiredFingerprint && existing.name === channelBlueprint.name) {
      summary.skippedChannels += 1;
      return existing.id;
    }

    await existing.edit(editChannelPayload(guild, channelBlueprint, parentId, overwrites) as never);

    logger.info(`Updated channel: ${channelBlueprint.name}`);
    summary.updatedChannels += 1;
    await stateManager.setChannel(key, {
      id: existing.id,
      name: channelBlueprint.name,
      parentId,
      type: channelTypeLabel(existing.type),
      fingerprint: desiredFingerprint,
      updatedAt: new Date().toISOString()
    });
    return existing.id;
  } catch (error) {
    const message = `Failed to provision channel ${channelBlueprint.name}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(message);
    summary.errors.push(message);
    return undefined;
  }
}

export async function ensureCategoriesAndChannels(
  guild: Guild,
  blueprint: Blueprint,
  stateManager: StateManager,
  roleIds: Map<string, string>,
  summary: ProvisionSummary,
  logger: Logger
): Promise<Map<string, string>> {
  const state = await stateManager.load();
  const channelIds = new Map<string, string>();

  for (const categoryBlueprint of blueprint.categories) {
    const parentId = await ensureCategory(guild, categoryBlueprint, state, stateManager, roleIds, summary, logger);

    for (const channelBlueprint of categoryBlueprint.channels) {
      const id = await ensureChannel(guild, channelBlueprint, parentId, state, stateManager, roleIds, summary, logger);
      if (id) {
        channelIds.set(channelBlueprint.name.toLowerCase(), id);
      }
    }
  }

  return channelIds;
}
