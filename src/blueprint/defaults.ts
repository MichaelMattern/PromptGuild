import type { AutomodRuleBlueprint, PermissionOverwriteBlueprint, StarterMessageBlueprint } from "./schema";

export const STAFF_ROLES = ["Owner", "Admin", "Moderator", "Staff"];
export const MEMBER_ROLES = ["Verified Member", "Member"];
export const EVERYONE = "@everyone";

export function staffOnlyPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Verified Member", allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: [], deny: ["ViewChannel"] },
    { role: "Staff", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    { role: "Moderator", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Admin", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageChannels"], deny: [] },
    { role: "Owner", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageGuild"], deny: [] }
  ];
}

export function publicCategoryPermissions(verificationEnabled: boolean): PermissionOverwriteBlueprint[] {
  if (!verificationEnabled) {
    return [
      { role: EVERYONE, allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
      mutedOverwrite()
    ];
  }

  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Verified Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

export function startHerePermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    { role: "Verified Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    mutedOverwrite()
  ];
}

export function readOnlyPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Verified Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Staff", allow: ["SendMessages", "ManageMessages"], deny: [] },
    { role: "Moderator", allow: ["SendMessages", "ManageMessages"], deny: [] },
    { role: "Admin", allow: ["SendMessages", "ManageChannels"], deny: [] },
    mutedOverwrite()
  ];
}

export function premiumPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Verified Member", allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: [], deny: ["ViewChannel"] },
    { role: "Trial Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    { role: "Premium Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    { role: "Staff", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

export function mutedOverwrite(): PermissionOverwriteBlueprint {
  return {
    role: "Muted",
    allow: ["ViewChannel", "ReadMessageHistory"],
    deny: ["SendMessages", "SendMessagesInThreads", "CreatePublicThreads", "CreatePrivateThreads", "AddReactions", "Speak"]
  };
}

export function standardRulesMessage(): StarterMessageBlueprint {
  return {
    title: "Server Rules",
    pin: true,
    body: [
      "Be respectful.",
      "No harassment, hate speech, threats, or spam.",
      "No impersonation.",
      "No illegal content.",
      "No sharing private information.",
      "Keep conversations in the correct channels.",
      "Follow staff instructions.",
      "Violations may lead to warnings, mutes, kicks, or bans."
    ].map((rule, index) => `${index + 1}. ${rule}`).join("\n")
  };
}

export function defaultAutomodRules(sensitive: boolean): AutomodRuleBlueprint[] {
  const scamKeywords = ["free nitro", "steam gift", "airdrop claim", "wallet verification", "support will never dm"];
  const rules: AutomodRuleBlueprint[] = [
    {
      name: "Block invite links",
      type: "invite_links",
      keywords: ["discord.gg/*", "discord.com/invite/*", "discordapp.com/invite/*"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "moderation-log"
    },
    {
      name: "Block mass mentions",
      type: "mass_mentions",
      keywords: [],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "moderation-log"
    },
    {
      name: "Block common scam phrases",
      type: "scam_phrases",
      keywords: scamKeywords,
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "moderation-log"
    },
    {
      name: "Block slurs and abuse",
      type: "slurs_abuse",
      keywords: ["<add-slur-keywords-here>"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "moderation-log"
    }
  ];

  if (sensitive) {
    rules.push({
      name: "Block misleading guarantee claims",
      type: "keyword",
      keywords: ["guaranteed profit", "risk-free investment", "sure win", "100% guaranteed"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "moderation-log"
    });
  }

  return rules;
}
