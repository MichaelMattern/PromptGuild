import { ChannelType, type Guild, type Message, type TextBasedChannel } from "discord.js";
import type { Blueprint, ChannelBlueprint, StarterMessageBlueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { Logger } from "../utils/logger";
import { channelKey, messageKey } from "../utils/resourceKeys";
import type { ProvisionSummary } from "./types";

function starterContent(message: StarterMessageBlueprint): string {
  return `## ${message.title}\n${message.body}`;
}

function asTextChannel(channel: unknown): TextBasedChannel | undefined {
  if (
    typeof channel === "object" &&
    channel !== null &&
    "isTextBased" in channel &&
    typeof channel.isTextBased === "function" &&
    channel.isTextBased()
  ) {
    return channel as TextBasedChannel;
  }

  return undefined;
}

async function findExistingMessage(
  textChannel: TextBasedChannel,
  botUserId: string | undefined,
  savedId: string | undefined,
  starter: StarterMessageBlueprint
): Promise<Message | undefined> {
  if (savedId && "messages" in textChannel) {
    try {
      return await textChannel.messages.fetch(savedId);
    } catch {
      // Fall through to content matching.
    }
  }

  if (!("messages" in textChannel)) {
    return undefined;
  }

  const messages = await textChannel.messages.fetch({ limit: 50 });
  return messages.find((candidate) => candidate.author.id === botUserId && candidate.content.startsWith(`## ${starter.title}\n`));
}

async function ensureStarterMessage(
  guild: Guild,
  channelBlueprint: ChannelBlueprint,
  starter: StarterMessageBlueprint,
  stateManager: StateManager,
  summary: ProvisionSummary,
  logger: Logger
): Promise<void> {
  const state = await stateManager.load();
  const channelState = state.channels[channelKey(channelBlueprint.name)];
  if (!channelState) {
    summary.skippedMessages += 1;
    logger.warn(`Skipping starter message for ${channelBlueprint.name}; channel is not in state.`);
    return;
  }

  const guildChannel = guild.channels.cache.get(channelState.id);
  if (!guildChannel || guildChannel.type === ChannelType.GuildForum) {
    summary.skippedMessages += 1;
    return;
  }

  const textChannel = asTextChannel(guildChannel);
  if (!textChannel) {
    summary.skippedMessages += 1;
    return;
  }

  const key = messageKey(channelBlueprint.name, starter.title);
  const saved = state.messages[key];
  const content = starterContent(starter);

  try {
    const existing = await findExistingMessage(textChannel, guild.client.user?.id, saved?.id, starter);
    if (existing) {
      if (existing.content !== content) {
        await existing.edit(content);
        summary.updatedMessages += 1;
        logger.info(`Updated starter message: ${channelBlueprint.name} / ${starter.title}`);
      } else {
        summary.skippedMessages += 1;
      }

      if (starter.pin && !existing.pinned) {
        await existing.pin("DiscordForge starter message").catch((error) => logger.warn(`Could not pin message ${starter.title}`, error));
      }

      await stateManager.setMessage(key, {
        id: existing.id,
        name: starter.title,
        title: starter.title,
        channelId: channelState.id,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    if (!("send" in textChannel)) {
      summary.skippedMessages += 1;
      return;
    }

    const sent = await textChannel.send(content);
    if (starter.pin) {
      await sent.pin("DiscordForge starter message").catch((error) => logger.warn(`Could not pin message ${starter.title}`, error));
    }

    logger.info(`Posted starter message: ${channelBlueprint.name} / ${starter.title}`);
    summary.postedMessages += 1;
    await stateManager.setMessage(key, {
      id: sent.id,
      name: starter.title,
      title: starter.title,
      channelId: channelState.id,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = `Failed to post starter message ${starter.title} in ${channelBlueprint.name}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(message);
    summary.errors.push(message);
  }
}

export async function ensureStarterMessages(
  guild: Guild,
  blueprint: Blueprint,
  stateManager: StateManager,
  summary: ProvisionSummary,
  logger: Logger
): Promise<void> {
  if (!blueprint.features.starterMessages) {
    return;
  }

  for (const category of blueprint.categories) {
    for (const channel of category.channels) {
      for (const starter of channel.starterMessages) {
        await ensureStarterMessage(guild, channel, starter, stateManager, summary, logger);
      }
    }
  }
}
