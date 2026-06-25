import type { Blueprint } from "../blueprint/schema";
import type { Logger } from "../utils/logger";
import type { ProvisionSummary } from "./types";

export function logOnboardingManualFallback(blueprint: Blueprint, summary: ProvisionSummary, logger: Logger): void {
  if (!blueprint.features.onboarding || !blueprint.onboarding.enabled) {
    return;
  }

  summary.onboardingManualSteps = blueprint.onboarding.questions.reduce((total, question) => total + question.options.length, 0);
  logger.warn(
    "Discord onboarding prompts are not fully exposed as a stable discord.js provisioning surface. Generated onboarding questions were saved in the blueprint; apply them manually from Server Settings > Onboarding."
  );
}
