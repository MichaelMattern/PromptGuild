export interface ProvisionSummary {
  createdRoles: number;
  updatedRoles: number;
  skippedRoles: number;
  createdCategories: number;
  updatedCategories: number;
  skippedCategories: number;
  createdChannels: number;
  updatedChannels: number;
  skippedChannels: number;
  postedMessages: number;
  updatedMessages: number;
  skippedMessages: number;
  createdWebhooks: number;
  updatedWebhooks: number;
  skippedWebhooks: number;
  createdAutomodRules: number;
  updatedAutomodRules: number;
  skippedAutomodRules: number;
  onboardingManualSteps: number;
  errors: string[];
}

export function createProvisionSummary(): ProvisionSummary {
  return {
    createdRoles: 0,
    updatedRoles: 0,
    skippedRoles: 0,
    createdCategories: 0,
    updatedCategories: 0,
    skippedCategories: 0,
    createdChannels: 0,
    updatedChannels: 0,
    skippedChannels: 0,
    postedMessages: 0,
    updatedMessages: 0,
    skippedMessages: 0,
    createdWebhooks: 0,
    updatedWebhooks: 0,
    skippedWebhooks: 0,
    createdAutomodRules: 0,
    updatedAutomodRules: 0,
    skippedAutomodRules: 0,
    onboardingManualSteps: 0,
    errors: []
  };
}
