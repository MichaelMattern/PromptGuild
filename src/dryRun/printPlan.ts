import type { DryRunPlan } from "./diff";

export function printPlan(plan: DryRunPlan): void {
  console.log(`Would create ${plan.roles.create} roles (${plan.roles.skip} already tracked)`);
  console.log(`Would create ${plan.categories.create} categories (${plan.categories.skip} already tracked)`);
  console.log(`Would create ${plan.channels.create} channels (${plan.channels.skip} already tracked)`);
  console.log(`Would post ${plan.starterMessages.create} starter messages (${plan.starterMessages.skip} already tracked)`);
  console.log(`Would create ${plan.webhooks.create} webhooks (${plan.webhooks.skip} already tracked)`);
  console.log(`Would create ${plan.automodRules.create} AutoMod rules (${plan.automodRules.skip} already tracked)`);

  if (plan.manualOnboardingSteps > 0) {
    console.log(`Would generate ${plan.manualOnboardingSteps} manual onboarding option steps`);
  }
}
