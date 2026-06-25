import type { Blueprint } from "../blueprint/schema";
import type { StateFile } from "../state/types";
import { automodRuleKey, categoryKey, channelKey, messageKey, roleKey, webhookKey } from "../utils/resourceKeys";

export interface DryRunPlan {
  roles: { create: number; skip: number };
  categories: { create: number; skip: number };
  channels: { create: number; skip: number };
  starterMessages: { create: number; skip: number };
  webhooks: { create: number; skip: number };
  automodRules: { create: number; skip: number };
  manualOnboardingSteps: number;
}

export function diffBlueprintAgainstState(blueprint: Blueprint, state: StateFile): DryRunPlan {
  const plan: DryRunPlan = {
    roles: { create: 0, skip: 0 },
    categories: { create: 0, skip: 0 },
    channels: { create: 0, skip: 0 },
    starterMessages: { create: 0, skip: 0 },
    webhooks: { create: 0, skip: 0 },
    automodRules: { create: 0, skip: 0 },
    manualOnboardingSteps: 0
  };

  for (const role of blueprint.roles) {
    if (state.roles[roleKey(role.name)]) plan.roles.skip += 1;
    else plan.roles.create += 1;
  }

  for (const category of blueprint.categories) {
    if (state.categories[categoryKey(category.name)]) plan.categories.skip += 1;
    else plan.categories.create += 1;

    for (const channel of category.channels) {
      if (state.channels[channelKey(channel.name)]) plan.channels.skip += 1;
      else plan.channels.create += 1;

      for (const starter of channel.starterMessages) {
        if (state.messages[messageKey(channel.name, starter.title)]) plan.starterMessages.skip += 1;
        else plan.starterMessages.create += 1;
      }

      for (const webhook of channel.webhooks) {
        if (state.webhooks[webhookKey(channel.name, webhook.name)]) plan.webhooks.skip += 1;
        else plan.webhooks.create += 1;
      }
    }
  }

  if (blueprint.automod.enabled && blueprint.features.automod) {
    for (const rule of blueprint.automod.rules) {
      if (state.automodRules[automodRuleKey(rule.name)]) plan.automodRules.skip += 1;
      else plan.automodRules.create += 1;
    }
  }

  if (blueprint.onboarding.enabled && blueprint.features.onboarding) {
    plan.manualOnboardingSteps = blueprint.onboarding.questions.reduce((total, question) => total + question.options.length, 0);
  }

  return plan;
}
