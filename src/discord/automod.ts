import {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleTriggerType,
  type Guild
} from "discord.js";
import type { AutomodRuleBlueprint, Blueprint } from "../blueprint/schema";
import type { StateManager } from "../state/stateManager";
import type { Logger } from "../utils/logger";
import { automodRuleKey } from "../utils/resourceKeys";
import { resolveRoleId } from "./permissions";
import type { ProvisionSummary } from "./types";

function triggerForRule(rule: AutomodRuleBlueprint) {
  if (rule.type === "mass_mentions") {
    return {
      triggerType: AutoModerationRuleTriggerType.MentionSpam,
      triggerMetadata: { mentionTotalLimit: 5 }
    };
  }

  return {
    triggerType: AutoModerationRuleTriggerType.Keyword,
    triggerMetadata: {
      keywordFilter: rule.keywords.length ? rule.keywords : ["<configure-keywords>"]
    }
  };
}

function actionsForRule(rule: AutomodRuleBlueprint, logChannelId?: string) {
  if (rule.action === "alert" && logChannelId) {
    return [{ type: AutoModerationActionType.SendAlertMessage, metadata: { channel: logChannelId } }];
  }

  return [
    {
      type: AutoModerationActionType.BlockMessage,
      metadata: { customMessage: "This message was blocked by server safety rules." }
    }
  ];
}

export async function ensureAutomodRules(
  guild: Guild,
  blueprint: Blueprint,
  stateManager: StateManager,
  roleIds: Map<string, string>,
  channelIds: Map<string, string>,
  summary: ProvisionSummary,
  logger: Logger
): Promise<void> {
  if (!blueprint.automod.enabled || !blueprint.features.automod) {
    return;
  }

  let existingRules;
  try {
    existingRules = await guild.autoModerationRules.fetch();
  } catch (error) {
    logger.warn("Could not fetch AutoMod rules. This may require Manage Guild permissions or Community settings.", error);
    summary.errors.push("AutoMod setup skipped because existing rules could not be fetched.");
    return;
  }

  const state = await stateManager.load();

  for (const rule of blueprint.automod.rules) {
    const key = automodRuleKey(rule.name);

    try {
      const savedId = state.automodRules[key]?.id;
      const existing = (savedId ? existingRules.get(savedId) : undefined) ?? existingRules.find((candidate) => candidate.name === rule.name);
      const logChannelId = rule.logChannel ? channelIds.get(rule.logChannel.toLowerCase()) : undefined;
      const exemptRoles = rule.exemptRoles
        .map((role) => resolveRoleId(guild, role, roleIds))
        .filter((id): id is string => Boolean(id));
      const trigger = triggerForRule(rule);
      const payload = {
        name: rule.name,
        enabled: true,
        eventType: AutoModerationRuleEventType.MessageSend,
        actions: actionsForRule(rule, logChannelId),
        exemptRoles,
        ...trigger,
        reason: "PromptGuild server setup"
      };

      if (existing) {
        await existing.edit(payload as never);
        summary.updatedAutomodRules += 1;
        logger.info(`Updated AutoMod rule: ${rule.name}`);
        await stateManager.setAutomodRule(key, { id: existing.id, name: rule.name, updatedAt: new Date().toISOString() });
        continue;
      }

      const created = await guild.autoModerationRules.create(payload as never);
      summary.createdAutomodRules += 1;
      logger.info(`Created AutoMod rule: ${rule.name}`);
      await stateManager.setAutomodRule(key, { id: created.id, name: rule.name, updatedAt: new Date().toISOString() });
    } catch (error) {
      const message = `Failed to provision AutoMod rule ${rule.name}: ${error instanceof Error ? error.message : String(error)}`;
      logger.warn(message, error);
      summary.errors.push(message);
    }
  }
}
