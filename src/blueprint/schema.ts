import { z } from "zod";

export const discordPermissions = [
  "Administrator",
  "ManageGuild",
  "ManageRoles",
  "ManageChannels",
  "ManageWebhooks",
  "ManageMessages",
  "ModerateMembers",
  "KickMembers",
  "BanMembers",
  "ViewChannel",
  "SendMessages",
  "SendMessagesInThreads",
  "CreatePublicThreads",
  "CreatePrivateThreads",
  "ReadMessageHistory",
  "AddReactions",
  "MentionEveryone",
  "UseExternalEmojis",
  "UseExternalStickers",
  "AttachFiles",
  "EmbedLinks",
  "Connect",
  "Speak",
  "MuteMembers",
  "DeafenMembers",
  "MoveMembers",
  "UseVAD",
  "PrioritySpeaker"
] as const;

export const discordPermissionSchema = z.enum(discordPermissions);

export const permissionOverwriteSchema = z.object({
  role: z.string().min(1),
  allow: z.array(discordPermissionSchema).default([]),
  deny: z.array(discordPermissionSchema).default([])
});

export const starterMessageSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  pin: z.boolean().default(false)
});

export const webhookSchema = z.object({
  name: z.string().min(1),
  purpose: z.string().optional()
});

export const channelTypeSchema = z.enum(["text", "voice", "forum", "announcement"]);

export const channelSchema = z.object({
  name: z.string().min(1),
  type: channelTypeSchema.default("text"),
  topic: z.string().optional(),
  slowmodeSeconds: z.number().int().min(0).max(21600).default(0),
  nsfw: z.boolean().default(false),
  permissions: z.array(permissionOverwriteSchema).default([]),
  starterMessages: z.array(starterMessageSchema).default([]),
  webhooks: z.array(webhookSchema).default([])
});

export const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(permissionOverwriteSchema).default([]),
  channels: z.array(channelSchema).default([])
});

export const roleSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#99AAB5"),
  hoist: z.boolean().default(false),
  mentionable: z.boolean().default(false),
  permissions: z.array(discordPermissionSchema).default([]),
  position: z.number().int().min(0).optional(),
  managedByBot: z.boolean().default(true)
});

export const automodRuleSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["keyword", "spam_links", "invite_links", "mass_mentions", "scam_phrases", "slurs_abuse"]),
  keywords: z.array(z.string()).default([]),
  action: z.enum(["block", "alert"]).default("block"),
  exemptRoles: z.array(z.string()).default([]),
  logChannel: z.string().optional()
});

export const automodSchema = z.object({
  enabled: z.boolean().default(true),
  rules: z.array(automodRuleSchema).default([])
});

export const onboardingSchema = z.object({
  enabled: z.boolean().default(true),
  welcomeMessage: z.string().default("Welcome to the server. Please read the rules and choose the channels that match your interests."),
  questions: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.enum(["single_select", "multi_select"]).default("multi_select"),
        options: z.array(
          z.object({
            label: z.string().min(1),
            role: z.string().optional(),
            channels: z.array(z.string()).default([])
          })
        )
      })
    )
    .default([])
});

export const featuresSchema = z.object({
  starterMessages: z.boolean().default(true),
  webhooks: z.boolean().default(false),
  automod: z.boolean().default(true),
  onboarding: z.boolean().default(true),
  supportTickets: z.boolean().default(false),
  premiumRoles: z.boolean().default(false),
  announcementChannels: z.boolean().default(true)
});

export const blueprintSchema = z.object({
  server: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    preferredTone: z.string().default("professional"),
    communityType: z.string().min(1),
    defaultLocale: z.string().default("en-US")
  }),
  roles: z.array(roleSchema).min(1),
  categories: z.array(categorySchema).min(1),
  automod: automodSchema.default({ enabled: true, rules: [] }),
  onboarding: onboardingSchema.default({ enabled: true }),
  features: featuresSchema.default({
    starterMessages: true,
    webhooks: false,
    automod: true,
    onboarding: true,
    supportTickets: false,
    premiumRoles: false,
    announcementChannels: true
  })
});

export type DiscordPermission = z.infer<typeof discordPermissionSchema>;
export type PermissionOverwriteBlueprint = z.infer<typeof permissionOverwriteSchema>;
export type StarterMessageBlueprint = z.infer<typeof starterMessageSchema>;
export type WebhookBlueprint = z.infer<typeof webhookSchema>;
export type ChannelBlueprint = z.infer<typeof channelSchema>;
export type CategoryBlueprint = z.infer<typeof categorySchema>;
export type RoleBlueprint = z.infer<typeof roleSchema>;
export type AutomodRuleBlueprint = z.infer<typeof automodRuleSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
