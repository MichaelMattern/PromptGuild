import type { Guild, TextChannel } from "discord.js";
import type { Blueprint, ChannelBlueprint, WebhookBlueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { Logger } from "../utils/logger";
import { channelKey, webhookKey } from "../utils/resourceKeys";
import type { ProvisionSummary } from "./types";

function canManageWebhooks(channel: unknown): channel is TextChannel {
  return (
    typeof channel === "object" &&
    channel !== null &&
    "fetchWebhooks" in channel &&
    "createWebhook" in channel &&
    typeof channel.fetchWebhooks === "function" &&
    typeof channel.createWebhook === "function"
  );
}

async function ensureWebhook(
  guild: Guild,
  channelBlueprint: ChannelBlueprint,
  webhook: WebhookBlueprint,
  stateManager: StateManager,
  summary: ProvisionSummary,
  logger: Logger
): Promise<void> {
  const state = await stateManager.load();
  const channelRecord = state.channels[channelKey(channelBlueprint.name)];
  if (!channelRecord) {
    summary.skippedWebhooks += 1;
    return;
  }

  const channel = guild.channels.cache.get(channelRecord.id);
  if (!canManageWebhooks(channel)) {
    summary.skippedWebhooks += 1;
    return;
  }

  const key = webhookKey(channelBlueprint.name, webhook.name);
  const saved = state.webhooks[key];

  try {
    const webhooks = await channel.fetchWebhooks();
    const existing = (saved?.id ? webhooks.get(saved.id) : undefined) ?? webhooks.find((candidate) => candidate.name === webhook.name);

    if (existing) {
      if (existing.name !== webhook.name) {
        await existing.edit({ name: webhook.name, reason: "DiscordForge server setup" });
        summary.updatedWebhooks += 1;
        logger.info(`Updated webhook: ${webhook.name}`);
      } else {
        summary.skippedWebhooks += 1;
      }

      await stateManager.setWebhook(key, {
        id: existing.id,
        name: webhook.name,
        channelId: channelRecord.id,
        purpose: webhook.purpose,
        updatedAt: new Date().toISOString()
      });
      return;
    }

    const created = await channel.createWebhook({
      name: webhook.name,
      reason: webhook.purpose ?? "DiscordForge server setup"
    });

    logger.info(`Created webhook: ${webhook.name}`);
    summary.createdWebhooks += 1;
    await stateManager.setWebhook(key, {
      id: created.id,
      name: webhook.name,
      channelId: channelRecord.id,
      purpose: webhook.purpose,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    const message = `Failed to provision webhook ${webhook.name}: ${error instanceof Error ? error.message : String(error)}`;
    logger.error(message);
    summary.errors.push(message);
  }
}

export async function ensureWebhooks(
  guild: Guild,
  blueprint: Blueprint,
  stateManager: StateManager,
  summary: ProvisionSummary,
  logger: Logger
): Promise<void> {
  if (!blueprint.features.webhooks) {
    return;
  }

  for (const category of blueprint.categories) {
    for (const channel of category.channels) {
      for (const webhook of channel.webhooks) {
        await ensureWebhook(guild, channel, webhook, stateManager, summary, logger);
      }
    }
  }
}
