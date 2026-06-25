import type {
  AutomodRuleBlueprint,
  Blueprint,
  CategoryBlueprint,
  ChannelBlueprint,
  PermissionOverwriteBlueprint,
  RoleBlueprint,
  StarterMessageBlueprint
} from "../blueprint/schema";
import { assertValidBlueprint } from "../blueprint/validateBlueprint";
import type { StructuredServerPlan } from "./promptInterpreter";

const EVERYONE = "@everyone";
const STAFF_ROLES = ["Owner", "Admin", "Developer", "Analyst", "Moderator"];
const ALERT_ROLES = ["Daily Slate Alerts", "VIP Alerts", "Arb Alerts", "Odds Movement Alerts", "Injury Alerts", "Model Update Alerts", "Results Recap Alerts"];
const INTEREST_ROLES = ["NFL", "NBA", "MLB", "NHL", "Arbitrage", "Props", "Live Betting", "Education", "Model Alerts", "Injury News", "Weather Alerts"];

function role(name: string, color: string, permissions: RoleBlueprint["permissions"] = [], options: Partial<RoleBlueprint> = {}): RoleBlueprint {
  return {
    name,
    color,
    hoist: options.hoist ?? false,
    mentionable: options.mentionable ?? false,
    permissions,
    position: options.position,
    managedByBot: true
  };
}

function message(title: string, body: string, pin = true): StarterMessageBlueprint {
  return { title, body, pin };
}

function mutedOverwrite(): PermissionOverwriteBlueprint {
  return {
    role: "Muted",
    allow: ["ViewChannel", "ReadMessageHistory"],
    deny: ["SendMessages", "SendMessagesInThreads", "CreatePublicThreads", "CreatePrivateThreads", "AddReactions", "Speak"]
  };
}

function startPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    { role: "Trial Member", allow: ["ViewChannel", "ReadMessageHistory"], deny: [] },
    mutedOverwrite()
  ];
}

function publicPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    { role: "Trial Member", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    { role: "Premium", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    { role: "VIP", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    mutedOverwrite()
  ];
}

function readFocusedPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Trial Member", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Premium", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "VIP", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Analyst", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Admin", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Bot", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

function vipPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: [], deny: ["ViewChannel"] },
    { role: "Trial Member", allow: [], deny: ["ViewChannel"] },
    { role: "VIP", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    { role: "Premium", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
    { role: "Admin", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Analyst", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Bot", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

function vipReadOnlyPermissions(): PermissionOverwriteBlueprint[] {
  return [
    ...vipPermissions().filter((overwrite) => !["VIP", "Premium"].includes(overwrite.role)),
    { role: "VIP", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] },
    { role: "Premium", allow: ["ViewChannel", "ReadMessageHistory", "AddReactions"], deny: ["SendMessages", "CreatePublicThreads", "CreatePrivateThreads"] }
  ];
}

function internalPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: [], deny: ["ViewChannel"] },
    { role: "Trial Member", allow: [], deny: ["ViewChannel"] },
    { role: "VIP", allow: [], deny: ["ViewChannel"] },
    { role: "Premium", allow: [], deny: ["ViewChannel"] },
    { role: "Owner", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageChannels"], deny: [] },
    { role: "Admin", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageChannels", "ManageMessages"], deny: [] },
    { role: "Developer", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageWebhooks"], deny: [] },
    { role: "Analyst", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    { role: "Moderator", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageMessages"], deny: [] },
    { role: "Bot", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

function automationPermissions(): PermissionOverwriteBlueprint[] {
  return [
    { role: EVERYONE, allow: [], deny: ["ViewChannel"] },
    { role: "Member", allow: [], deny: ["ViewChannel"] },
    { role: "Trial Member", allow: [], deny: ["ViewChannel"] },
    { role: "VIP", allow: [], deny: ["ViewChannel"] },
    { role: "Premium", allow: [], deny: ["ViewChannel"] },
    { role: "Owner", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageChannels"], deny: [] },
    { role: "Admin", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageWebhooks"], deny: [] },
    { role: "Developer", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "ManageWebhooks"], deny: [] },
    { role: "Analyst", allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages"] },
    { role: "Moderator", allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages"] },
    { role: "Bot", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
    mutedOverwrite()
  ];
}

function channelGuide(name: string, purpose: string, whoCanPost: string): StarterMessageBlueprint {
  return message("Channel Guide", `Purpose: ${purpose}\nWho can post: ${whoCanPost}\nKeep discussion professional, data-focused, and free of guaranteed claims.`, true);
}

function channel(name: string, purpose: string, options: Partial<ChannelBlueprint> & { whoCanPost?: string } = {}): ChannelBlueprint {
  return {
    name,
    type: options.type ?? "text",
    topic: options.topic ?? purpose,
    slowmodeSeconds: options.slowmodeSeconds ?? 0,
    nsfw: options.nsfw ?? false,
    permissions: options.permissions ?? [],
    starterMessages: options.starterMessages ?? [channelGuide(name, purpose, options.whoCanPost ?? "Members with access")],
    webhooks: options.webhooks ?? []
  };
}

function category(name: string, description: string, permissions: PermissionOverwriteBlueprint[], channels: ChannelBlueprint[]): CategoryBlueprint {
  return { name, description, permissions, channels };
}

function roles(): RoleBlueprint[] {
  const hierarchy = [
    role("Owner", "#FEE75C", ["Administrator"], { hoist: true, position: 40 }),
    role("Admin", "#ED4245", ["ManageGuild", "ManageRoles", "ManageChannels", "ManageMessages", "ManageWebhooks"], { hoist: true, position: 39 }),
    role("Developer", "#3498DB", ["ManageWebhooks", "ManageChannels", "ManageMessages"], { hoist: true, position: 38 }),
    role("Analyst", "#9B59B6", ["ManageMessages"], { hoist: true, mentionable: true, position: 37 }),
    role("Moderator", "#57F287", ["ManageMessages", "ModerateMembers", "KickMembers", "BanMembers"], { hoist: true, position: 36 }),
    role("VIP", "#F1C40F", [], { mentionable: true, position: 35 }),
    role("Premium", "#1ABC9C", [], { mentionable: true, position: 34 }),
    role("Member", "#99AAB5", [], { position: 33 }),
    role("Trial Member", "#BCC0C0", [], { position: 32 }),
    role("Bot", "#2C3E50", [], { hoist: true, position: 31 }),
    role("Muted", "#2F3136", [], { position: 1 })
  ];

  const interest = INTEREST_ROLES.map((name) => role(name, "#5865F2", [], { mentionable: true, position: 20 }));
  const alerts = ALERT_ROLES.map((name) => role(name, "#E67E22", [], { mentionable: true, position: 19 }));
  return [...hierarchy, ...interest, ...alerts];
}

function startHereCategory(): CategoryBlueprint {
  return category("START HERE", "Onboarding, rules, announcements, and responsible-use disclaimers.", startPermissions(), [
    channel("welcome", "Welcome new members and direct them to the launch checklist.", {
      permissions: [{ role: EVERYONE, allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages"] }],
      starterMessages: [
        message(
          "Welcome to MatternsPatterns",
          "This community is built for people who want to understand sports markets through data, models, odds movement, and disciplined analysis.\n\nStart here:\n1. Read the rules.\n2. Learn how the server works.\n3. Pick your sports and alert roles.\n4. Check the daily slate.\n5. Ask questions and stay data-focused.\n\nImportant: MatternsPatterns provides analytics and educational information only. Nothing here is guaranteed.",
          true
        )
      ]
    }),
    channel("rules", "Server rules and conduct expectations.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "MatternsPatterns Rules",
          "1. Be respectful.\n2. No harassment, hate speech, spam, or scams.\n3. No selling picks without permission.\n4. No fake results or misleading claims.\n5. No financial guarantees.\n6. Do not pressure others to place bets.\n7. Keep discussion data-focused.\n8. Follow Discord Terms of Service.\n9. MatternsPatterns provides analytics and educational information, not financial advice.",
          true
        )
      ]
    }),
    channel("start-here", "Member onboarding steps and first actions.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "Start Here",
          "1. Read #rules.\n2. Read #disclaimers.\n3. Review #how-to-use-matternspatterns.\n4. Choose sports and alert roles when self-select roles are enabled.\n5. Introduce yourself in #introductions.\n6. Visit #daily-slate and #market-overview.",
          true
        )
      ]
    }),
    channel("announcements", "Official MatternsPatterns announcements.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "MatternsPatterns Daily Update Template",
          "Date:\nSports covered:\nKey market notes:\nModel updates:\nTop storylines:\nImportant injuries/news:\nVIP updates:\nResponsible use reminder:",
          true
        )
      ]
    }),
    channel("how-to-use-matternspatterns", "Explain analytics channels, VIP access, alerts, and responsible use.", {
      permissions: readFocusedPermissions()
    }),
    channel("disclaimers", "Sports betting, analytics, legality, and responsible-use disclaimers.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "Important Disclaimer",
          "MatternsPatterns provides sports analytics, research, model outputs, and market information for educational and informational purposes only. Nothing in this server is guaranteed. Users are responsible for their own decisions. Bet responsibly and only where legal.",
          true
        )
      ]
    })
  ]);
}

function hubCategory(): CategoryBlueprint {
  return category("MATTERNSPATTERNS HUB", "Core sports analytics command center.", publicPermissions(), [
    channel("daily-slate", "Daily board overview and slate context.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "Daily Slate Template",
          "Title: Daily Slate - [Date]\n\nGames on the board:\nHighest-volume markets:\nBiggest line movement:\nModel watchlist:\nInjury/weather notes:\nEdges under review:\nVIP card status:",
          true
        )
      ]
    }),
    channel("market-overview", "High-level market movement, volume, and pricing context.", { permissions: readFocusedPermissions() }),
    channel("model-card", "Model card and projection context.", {
      permissions: readFocusedPermissions(),
      starterMessages: [
        message(
          "Model Insight Template",
          "Title: Model Insight - [Sport/Game]\n\nGame:\nMarket:\nCurrent line:\nModel projection:\nEdge:\nConfidence tier:\nKey factors:\nRisks:\nClosing line tracking:\nResult:",
          true
        )
      ]
    }),
    channel("top-edges", "Published top edges and risk-adjusted opportunities.", { permissions: readFocusedPermissions() }),
    channel("odds-movement", "Odds movement and market discrepancy alerts.", { permissions: readFocusedPermissions() }),
    channel("closing-line-value", "CLV tracking and post-market review.", { permissions: readFocusedPermissions() }),
    channel("results-recap", "Results, lessons, and transparent recap notes.", { permissions: readFocusedPermissions() })
  ]);
}

function sportCategory(name: string, channels: string[]): CategoryBlueprint {
  return category(name, `${name} discussion, model outputs, market analysis, news context, and results tracking.`, publicPermissions(), channels.map((channelName) => {
    const readOnly = /models|edges|results|injuries|weather|pitchers|umpires|goalies/.test(channelName);
    return channel(channelName, `${name} ${channelName.replace(`${name.toLowerCase()}-`, "").replace(/-/g, " ")}.`, {
      permissions: readOnly ? readFocusedPermissions() : [],
      slowmodeSeconds: channelName.endsWith("-chat") ? 5 : 0,
      whoCanPost: readOnly ? "Admins, analysts, and approved bots" : "Members with access"
    });
  }));
}

function vipCategory(): CategoryBlueprint {
  const readOnly = new Set(["vip-daily-card", "vip-top-plays", "vip-arb-alerts", "vip-live-market-alerts"]);
  const names = ["vip-daily-card", "vip-top-plays", "vip-arb-alerts", "vip-live-market-alerts", "vip-model-notes", "vip-bankroll-strategy", "vip-results-tracking", "vip-questions"];
  return category("VIP INTELLIGENCE", "Premium insights, deeper model explanations, alerts, and VIP discussion.", vipPermissions(), names.map((name) =>
    channel(name, `VIP ${name.replace("vip-", "").replace(/-/g, " ")}.`, {
      permissions: readOnly.has(name) ? vipReadOnlyPermissions() : [],
      whoCanPost: readOnly.has(name) ? "Admins, analysts, and approved bots" : "VIP and Premium members"
    })
  ));
}

function educationCategory(): CategoryBlueprint {
  return category("EDUCATION", "Learn odds, expected value, arbitrage, modeling, bankroll management, and responsible decision-making.", publicPermissions(), [
    "sports-betting-101",
    "understanding-odds",
    "expected-value",
    "bankroll-management",
    "arbitrage-explained",
    "model-education",
    "faq"
  ].map((name) => channel(name, `Education content for ${name.replace(/-/g, " ")}.`, { permissions: name === "faq" ? readFocusedPermissions() : [] })));
}

function communityCategory(): CategoryBlueprint {
  return category("COMMUNITY", "Professional community discussion and feedback.", publicPermissions(), [
    channel("general-chat", "General sports analytics discussion.", { slowmodeSeconds: 5 }),
    channel("wins-and-lessons", "Share outcomes, lessons, and process improvements without misleading claims."),
    channel("member-questions", "Ask data-focused community questions."),
    channel("suggestions", "Suggest improvements to the server, product, data, or content."),
    channel("introductions", "Introduce yourself and your sports interests."),
    channel("off-topic", "Light non-core discussion while staying professional.", { slowmodeSeconds: 10 })
  ]);
}

function supportCategory(): CategoryBlueprint {
  return category("SUPPORT", "Platform access, billing, technical issues, bug reports, and product suggestions.", publicPermissions(), [
    channel("support", "General support requests.", { starterMessages: [message("Support", "Describe the issue clearly. Do not post passwords, API keys, payment details, or private account information.", true)] }),
    channel("billing-help", "Subscription and billing support intake."),
    channel("bug-reports", "Report reproducible bugs with expected and actual behavior."),
    channel("feature-requests", "Request product or server improvements."),
    channel("contact-team", "Escalate requests that need direct staff review.")
  ]);
}

function internalCategory(): CategoryBlueprint {
  return category("INTERNAL", "Staff coordination, analytics review, moderation, bot monitoring, and product planning.", internalPermissions(), [
    "admin-chat",
    "analyst-notes",
    "content-planning",
    "bot-logs",
    "webhook-logs",
    "mod-logs",
    "incident-reports",
    "roadmap"
  ].map((name) => channel(name, `Internal ${name.replace(/-/g, " ")}.`, { permissions: name.includes("logs") ? automationPermissions() : [] })));
}

function automationCategory(): CategoryBlueprint {
  return category("AUTOMATION / BOT CHANNELS", "Future integrations with APIs, model pipelines, odds feeds, scanners, dashboards, and status alerts.", automationPermissions(), [
    "bot-status",
    "api-alerts",
    "data-pipeline-alerts",
    "odds-api-alerts",
    "model-run-alerts",
    "system-errors"
  ].map((name) => channel(name, `Automation channel for ${name.replace(/-/g, " ")}.`, {
    permissions: automationPermissions(),
    whoCanPost: "Admins, developers, and approved bots",
    webhooks: [{ name: `MatternsPatterns ${name.replace(/-/g, " ")}`, purpose: `Future ${name.replace(/-/g, " ")} integration` }]
  })));
}

function automodRules(): AutomodRuleBlueprint[] {
  return [
    {
      name: "Block invite links",
      type: "invite_links",
      keywords: ["discord.gg/*", "discord.com/invite/*", "discordapp.com/invite/*"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "mod-logs"
    },
    {
      name: "Block mass mentions",
      type: "mass_mentions",
      keywords: [],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "mod-logs"
    },
    {
      name: "Block scam phrases",
      type: "scam_phrases",
      keywords: ["free nitro", "guaranteed lock", "free money", "can't lose", "risk-free bet", "sure win"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "mod-logs"
    },
    {
      name: "Block misleading guarantee claims",
      type: "keyword",
      keywords: ["lock of the year", "guaranteed winner", "can't lose", "free money", "100% guaranteed"],
      action: "block",
      exemptRoles: STAFF_ROLES,
      logChannel: "mod-logs"
    }
  ];
}

export function isMatternsPatternsPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return lower.includes("matternspatterns") || (lower.includes("sports analytics") && lower.includes("betting"));
}

export function matternsPatternsBlueprint(plan: StructuredServerPlan): Blueprint {
  return assertValidBlueprint({
    server: {
      name: "MatternsPatterns",
      description:
        "MatternsPatterns is a sports analytics community built around data-driven insights, market movement, model projections, and smarter sports decision-making.",
      preferredTone: "sharp, helpful, premium, and data-focused",
      communityType: "Sports/analytics community",
      defaultLocale: "en-US"
    },
    roles: roles(),
    categories: [
      startHereCategory(),
      hubCategory(),
      sportCategory("NFL", ["nfl-chat", "nfl-models", "nfl-edges", "nfl-injuries", "nfl-weather", "nfl-results"]),
      sportCategory("NBA", ["nba-chat", "nba-models", "nba-edges", "nba-injuries", "nba-results"]),
      sportCategory("MLB", ["mlb-chat", "mlb-models", "mlb-edges", "mlb-pitchers", "mlb-umpires", "mlb-weather", "mlb-results"]),
      sportCategory("NHL", ["nhl-chat", "nhl-models", "nhl-edges", "nhl-goalies", "nhl-results"]),
      vipCategory(),
      educationCategory(),
      communityCategory(),
      supportCategory(),
      internalCategory(),
      automationCategory()
    ],
    automod: {
      enabled: true,
      rules: automodRules()
    },
    onboarding: {
      enabled: true,
      welcomeMessage: "Welcome to MatternsPatterns. Read the rules, review disclaimers, choose sports interests, and start with daily slate and market overview.",
      questions: [
        {
          title: "Choose your sports interests",
          type: "multi_select",
          options: [
            { label: "NFL", role: "NFL", channels: ["nfl-chat", "nfl-models", "nfl-edges"] },
            { label: "NBA", role: "NBA", channels: ["nba-chat", "nba-models", "nba-edges"] },
            { label: "MLB", role: "MLB", channels: ["mlb-chat", "mlb-models", "mlb-edges"] },
            { label: "NHL", role: "NHL", channels: ["nhl-chat", "nhl-models", "nhl-edges"] }
          ]
        },
        {
          title: "Choose analytics alerts",
          type: "multi_select",
          options: [
            { label: "Daily Slate Alerts", role: "Daily Slate Alerts", channels: ["daily-slate"] },
            { label: "Arb Alerts", role: "Arb Alerts", channels: ["vip-arb-alerts"] },
            { label: "Odds Movement Alerts", role: "Odds Movement Alerts", channels: ["odds-movement"] },
            { label: "Model Update Alerts", role: "Model Update Alerts", channels: ["model-card", "model-run-alerts"] },
            { label: "Injury Alerts", role: "Injury Alerts", channels: ["nfl-injuries", "nba-injuries", "mlb-weather", "nhl-goalies"] }
          ]
        }
      ]
    },
    features: {
      starterMessages: true,
      webhooks: true,
      automod: true,
      onboarding: true,
      supportTickets: true,
      premiumRoles: true,
      announcementChannels: false
    }
  });
}
