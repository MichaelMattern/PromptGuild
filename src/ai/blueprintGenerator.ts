import {
  defaultAutomodRules,
  premiumPermissions,
  publicCategoryPermissions,
  readOnlyPermissions,
  STAFF_ROLES,
  staffOnlyPermissions,
  standardRulesMessage,
  startHerePermissions
} from "../blueprint/defaults";
import { assertValidBlueprint } from "../blueprint/validateBlueprint";
import type {
  Blueprint,
  CategoryBlueprint,
  ChannelBlueprint,
  PermissionOverwriteBlueprint,
  RoleBlueprint,
  StarterMessageBlueprint
} from "../blueprint/schema";
import { slugify } from "../utils/slugify";
import { isMatternsPatternsPrompt, matternsPatternsBlueprint } from "./matternsPatternsBlueprint";
import { heuristicInterpretPrompt, interpretPrompt, type StructuredServerPlan } from "./promptInterpreter";
import type { Logger } from "../utils/logger";

interface GenerateBlueprintOptions {
  prompt: string;
  logger?: Logger;
}

interface RoleOptions {
  color?: string;
  hoist?: boolean;
  mentionable?: boolean;
  permissions?: RoleBlueprint["permissions"];
  position?: number;
}

function role(name: string, options: RoleOptions = {}): RoleBlueprint {
  return {
    name,
    color: options.color ?? "#99AAB5",
    hoist: options.hoist ?? false,
    mentionable: options.mentionable ?? false,
    permissions: options.permissions ?? [],
    position: options.position,
    managedByBot: true
  };
}

function message(title: string, body: string, pin = false): StarterMessageBlueprint {
  return { title, body, pin };
}

function channel(
  name: string,
  options: Partial<Omit<ChannelBlueprint, "name">> = {}
): ChannelBlueprint {
  return {
    name,
    type: options.type ?? "text",
    topic: options.topic,
    slowmodeSeconds: options.slowmodeSeconds ?? 0,
    nsfw: options.nsfw ?? false,
    permissions: options.permissions ?? [],
    starterMessages: options.starterMessages ?? [],
    webhooks: options.webhooks ?? []
  };
}

function category(
  name: string,
  channels: ChannelBlueprint[],
  permissions: PermissionOverwriteBlueprint[],
  description?: string
): CategoryBlueprint {
  return { name, description, permissions, channels };
}

function uniqueRoles(roles: RoleBlueprint[]): RoleBlueprint[] {
  const seen = new Set<string>();
  const result: RoleBlueprint[] = [];

  for (const item of roles) {
    const key = item.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result.map((item, index) => ({ ...item, position: item.position ?? roles.length - index }));
}

function standardRoles(plan: StructuredServerPlan): RoleBlueprint[] {
  const roles: RoleBlueprint[] = [
    role("Owner", { color: "#FEE75C", hoist: true, permissions: ["Administrator"] }),
    role("Admin", {
      color: "#ED4245",
      hoist: true,
      permissions: ["ManageGuild", "ManageRoles", "ManageChannels", "ManageMessages", "ManageWebhooks"]
    }),
    role("Moderator", {
      color: "#EB459E",
      hoist: true,
      permissions: ["ManageMessages", "ModerateMembers", "KickMembers", "BanMembers"]
    }),
    role("Staff", { color: "#5865F2", hoist: true, permissions: ["ManageMessages"] }),
    role("Verified Member", { color: "#57F287" }),
    role("Member", { color: "#99AAB5" }),
    role("Muted", { color: "#2F3136" })
  ];

  if (plan.desiredFeatures.premiumRoles) {
    roles.push(role("Premium Member", { color: "#F1C40F", mentionable: true }));
    roles.push(role("Trial Member", { color: "#E67E22" }));
  }

  if (plan.template === "Creator/influencer community") {
    roles.push(role("Creator", { color: "#9B59B6", hoist: true, mentionable: true }));
    roles.push(role("Contributor", { color: "#1ABC9C" }));
  }

  if (plan.template === "Sports/analytics community" || plan.template === "Finance/trading community") {
    roles.push(role("Analyst", { color: "#3498DB", hoist: true, mentionable: true }));
    roles.push(role("Contributor", { color: "#1ABC9C" }));
  }

  if (plan.desiredFeatures.education) {
    roles.push(role("Instructor", { color: "#9B59B6", hoist: true, mentionable: true }));
    roles.push(role("Teaching Assistant", { color: "#3498DB", hoist: true }));
    roles.push(role("Student", { color: "#57F287" }));
  }

  if (plan.desiredFeatures.gaming) {
    roles.push(role("Team Captain", { color: "#E67E22", hoist: true, mentionable: true }));
    roles.push(role("Looking For Group", { color: "#1ABC9C", mentionable: true }));
    roles.push(role("Event Participant", { color: "#FEE75C" }));
  }

  return uniqueRoles(roles);
}

function welcomeMessage(plan: StructuredServerPlan): StarterMessageBlueprint {
  return message(
    "Welcome",
    `Welcome to this ${plan.businessType} Discord community. Start with the rules, introduce yourself, and use the channel list to find announcements, resources, support, and staff guidance.`,
    true
  );
}

function howToMessage(plan: StructuredServerPlan): StarterMessageBlueprint {
  const premiumLine = plan.desiredFeatures.premiumRoles ? "\n- Premium channels are visible after the correct role is assigned." : "";
  const supportLine = plan.desiredFeatures.supportTickets ? "\n- Use the support area for help requests and product questions." : "";

  return message(
    "How to Use This Server",
    `- Read the rules before posting.\n- Use announcements for official updates.\n- Keep conversations in the channel that best matches the topic.${supportLine}${premiumLine}\n- Contact staff if something looks unsafe or out of place.`,
    true
  );
}

function disclaimerMessage(topics: string[]): StarterMessageBlueprint {
  const topicText = topics.length ? topics.join(", ") : "sensitive topics";
  return message(
    "Important Disclaimer",
    `Content related to ${topicText} is provided for educational and informational purposes only. Nothing here guarantees outcomes or replaces qualified professional advice. Follow all applicable laws, age requirements, platform terms, and local regulations before acting on information shared in this server.`,
    true
  );
}

function startHereCategory(plan: StructuredServerPlan): CategoryBlueprint {
  const channels = [
    channel("welcome", {
      topic: "Start here for the community overview.",
      permissions: readOnlyPermissions(),
      starterMessages: [welcomeMessage(plan)]
    }),
    channel("rules", {
      topic: "Server rules and conduct expectations.",
      permissions: readOnlyPermissions(),
      starterMessages: [standardRulesMessage()]
    }),
    channel("how-to-use-this-server", {
      topic: "A practical map for using this server.",
      permissions: readOnlyPermissions(),
      starterMessages: [howToMessage(plan)]
    }),
    channel("verify", {
      topic: "Verification and role instructions.",
      permissions: [
        { role: "@everyone", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages", "AddReactions"], deny: [] },
        { role: "Muted", allow: ["ViewChannel", "ReadMessageHistory"], deny: ["SendMessages", "AddReactions"] }
      ],
      starterMessages: [
        message(
          "Verification",
          "Use this channel for verification instructions. Staff can replace this message with a reaction role, form, or bot-based verification flow.",
          true
        )
      ]
    })
  ];

  if (plan.sensitiveTopics.length > 0) {
    channels.splice(
      2,
      0,
      channel("disclaimers", {
        topic: "Important safety, compliance, and informational-use disclaimers.",
        permissions: readOnlyPermissions(),
        starterMessages: [disclaimerMessage(plan.sensitiveTopics)]
      })
    );
  }

  return category("START HERE", channels, startHerePermissions(), "Onboarding, rules, and verification.");
}

function announcementsCategory(plan: StructuredServerPlan): CategoryBlueprint {
  const channels = [
    channel("announcements", {
      type: "announcement",
      topic: "Official announcements.",
      permissions: readOnlyPermissions(),
      starterMessages: [message("Announcements", "Official updates will be posted here. Members should keep notifications enabled for this channel.", true)]
    }),
    channel("updates", {
      topic: "Operational updates and community notices.",
      permissions: readOnlyPermissions()
    })
  ];

  if (plan.template === "SaaS/product community" || plan.keywords.includes("product")) {
    channels.push(
      channel("changelog", {
        type: "announcement",
        topic: "Product changes, releases, and known issues.",
        permissions: readOnlyPermissions(),
        starterMessages: [message("Changelog", "Product releases, fixes, and meaningful changes will be summarized here.", true)]
      })
    );
  }

  return category("ANNOUNCEMENTS", channels, publicCategoryPermissions(true), "Official one-way updates.");
}

function communityCategory(plan: StructuredServerPlan): CategoryBlueprint {
  return category(
    "COMMUNITY",
    [
      channel("general", { topic: "General community discussion.", slowmodeSeconds: 3 }),
      channel("introductions", {
        topic: "New member introductions.",
        starterMessages: [message("Introductions", "Introduce yourself with your name, what brought you here, and what you are hoping to learn or share.", false)]
      }),
      channel("questions", { topic: "Ask the community for help, context, or recommendations." })
    ],
    publicCategoryPermissions(true),
    "Member discussion spaces."
  );
}

function supportCategory(plan: StructuredServerPlan): CategoryBlueprint {
  const channels = [
    channel("support", {
      topic: "Ask for help from staff and experienced members.",
      starterMessages: [message("Support", "Post your question with enough detail for someone to reproduce or understand the issue. Do not share private credentials, billing details, or personal information.", true)]
    })
  ];

  if (plan.template === "SaaS/product community" || plan.supportNeeds.includes("bug reports")) {
    channels.push(channel("bug-reports", { topic: "Report reproducible bugs with steps, expected result, and actual result." }));
    channels.push(channel("feature-requests", { topic: "Suggest improvements and vote on ideas." }));
  }

  if (plan.desiredFeatures.supportTickets) {
    channels.push(channel("ticket-intake", { topic: "Manual ticket intake queue. Replace with a ticket bot if desired." }));
  }

  return category("SUPPORT", channels, publicCategoryPermissions(true), "Help, bugs, and requests.");
}

function resourcesCategory(plan: StructuredServerPlan): CategoryBlueprint {
  return category(
    "RESOURCES",
    [
      channel("resources", { topic: "Curated links, documents, and reference material." }),
      channel("faq", {
        topic: "Frequently asked questions.",
        permissions: readOnlyPermissions(),
        starterMessages: [message("FAQ", "Add common questions and concise answers here as the server matures.", true)]
      })
    ],
    publicCategoryPermissions(true),
    "Reference material."
  );
}

function premiumCategory(): CategoryBlueprint {
  return category(
    "PREMIUM",
    [
      channel("premium-info", {
        topic: "Premium access details and member expectations.",
        permissions: readOnlyPermissions(),
        starterMessages: [message("Premium Access", "Premium channels are reserved for members with Premium Member or Trial Member roles. Keep paid content private and follow the same community rules.", true)]
      }),
      channel("premium-chat", { topic: "Private discussion for premium members.", slowmodeSeconds: 3 }),
      channel("premium-resources", { topic: "Premium templates, resources, or recordings." })
    ],
    premiumPermissions(),
    "Private premium member area."
  );
}

function educationCategories(): CategoryBlueprint[] {
  return [
    category(
      "COURSE CONTENT",
      [
        channel("lesson-announcements", {
          type: "announcement",
          topic: "Lesson releases and course updates.",
          permissions: readOnlyPermissions()
        }),
        channel("lesson-discussion", { topic: "Discuss current lessons and learning objectives." }),
        channel("study-resources", { topic: "Shared resources for students." })
      ],
      publicCategoryPermissions(true),
      "Course lessons and supporting material."
    ),
    category(
      "ASSIGNMENTS",
      [
        channel("assignments", { topic: "Assignment prompts, due dates, and clarifications.", permissions: readOnlyPermissions() }),
        channel("assignment-help", { topic: "Ask for help without posting private grades or credentials." })
      ],
      publicCategoryPermissions(true),
      "Course work coordination."
    ),
    category(
      "OFFICE HOURS",
      [
        channel("office-hours", { topic: "Schedule and questions for live help." }),
        channel("office-hours-voice", { type: "voice", topic: "Live office hours voice room." })
      ],
      publicCategoryPermissions(true),
      "Instructor and TA help."
    )
  ];
}

function gamingCategories(): CategoryBlueprint[] {
  return [
    category(
      "LFG",
      [
        channel("looking-for-group", { topic: "Find players for matches, squads, and practice." }),
        channel("lfg-voice", { type: "voice", topic: "Temporary group voice room." })
      ],
      publicCategoryPermissions(true),
      "Matchmaking and player coordination."
    ),
    category(
      "TOURNAMENTS",
      [
        channel("tournament-announcements", { type: "announcement", topic: "Tournament news and bracket updates.", permissions: readOnlyPermissions() }),
        channel("tournament-chat", { topic: "Tournament coordination and questions." }),
        channel("team-captains", {
          topic: "Captain coordination.",
          permissions: [
            { role: "@everyone", allow: [], deny: ["ViewChannel"] },
            { role: "Team Captain", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] },
            { role: "Staff", allow: ["ViewChannel", "ReadMessageHistory", "SendMessages"], deny: [] }
          ]
        })
      ],
      publicCategoryPermissions(true),
      "Events and competitive play."
    )
  ];
}

function sensitiveDomainCategories(plan: StructuredServerPlan): CategoryBlueprint[] {
  if (plan.template === "Finance/trading community") {
    return [
      category(
        "MARKET EDUCATION",
        [
          channel("education", { topic: "Educational market discussion without guarantees or individualized financial advice." }),
          channel("alerts", {
            type: "announcement",
            topic: "Informational alerts. No outcome is guaranteed.",
            permissions: readOnlyPermissions()
          }),
          channel("risk-management", { topic: "Risk management concepts, sizing, and process discussion." })
        ],
        publicCategoryPermissions(true),
        "Educational finance and trading content."
      )
    ];
  }

  if (plan.template === "Sports/analytics community") {
    return [
      category(
        "SPORTS ANALYTICS",
        [
          channel("analysis", { topic: "Sports analytics discussion and model notes." }),
          channel("alerts", {
            type: "announcement",
            topic: "Informational sports alerts and updates.",
            permissions: readOnlyPermissions()
          }),
          channel("responsible-play", { topic: "Responsible play, legal compliance, and risk reminders.", permissions: readOnlyPermissions() })
        ],
        publicCategoryPermissions(true),
        "Sports analysis with responsible-use framing."
      )
    ];
  }

  return [];
}

function creatorCategories(plan: StructuredServerPlan): CategoryBlueprint[] {
  if (plan.template !== "Creator/influencer community") {
    return [];
  }

  return [
    category(
      "CREATOR HUB",
      [
        channel("content-drops", { type: "announcement", topic: "New content, streams, and releases.", permissions: readOnlyPermissions() }),
        channel("fan-chat", { topic: "Community discussion for fans and subscribers." }),
        channel("collabs", { topic: "Collaboration ideas and contributor coordination." })
      ],
      publicCategoryPermissions(true),
      "Creator updates and fan engagement."
    )
  ];
}

function localCommunityCategories(plan: StructuredServerPlan): CategoryBlueprint[] {
  if (plan.template !== "Local/community organization") {
    return [];
  }

  return [
    category(
      "EVENTS",
      [
        channel("events", { topic: "Upcoming events, meetups, and reminders." }),
        channel("event-planning", { topic: "Coordinate logistics and attendance." })
      ],
      publicCategoryPermissions(true),
      "Community events."
    ),
    category(
      "VOLUNTEER COORDINATION",
      [
        channel("volunteer-opportunities", { type: "announcement", topic: "Volunteer needs and signups.", permissions: readOnlyPermissions() }),
        channel("volunteer-chat", { topic: "Volunteer coordination and updates." })
      ],
      publicCategoryPermissions(true),
      "Volunteer work and logistics."
    )
  ];
}

function openSourceCategories(plan: StructuredServerPlan): CategoryBlueprint[] {
  if (plan.template !== "Open-source/project community") {
    return [];
  }

  return [
    category(
      "PROJECT",
      [
        channel("development", { topic: "Development discussion and implementation notes." }),
        channel("issues", { topic: "Bug triage and issue discussion." }),
        channel("pull-requests", { topic: "Pull request review coordination." })
      ],
      publicCategoryPermissions(true),
      "Open-source project coordination."
    )
  ];
}

function eventsCategory(plan: StructuredServerPlan): CategoryBlueprint[] {
  if (!plan.desiredFeatures.events || ["Gaming community", "Education/course community", "Local/community organization"].includes(plan.template)) {
    return [];
  }

  return [
    category(
      "EVENTS",
      [
        channel("events", { topic: "Upcoming events, workshops, AMAs, and reminders." }),
        channel("event-chat", { topic: "Event questions and live discussion." })
      ],
      publicCategoryPermissions(true),
      "Events and live programming."
    )
  ];
}

function staffCategory(): CategoryBlueprint {
  return category(
    "STAFF",
    [
      channel("staff-chat", { topic: "Private staff discussion." }),
      channel("moderation-log", {
        topic: "Moderation and automation logs.",
        starterMessages: [message("Moderation Log", "Moderation notes and AutoMod actions should be tracked here. Keep this channel staff-only.", true)]
      }),
      channel("admin-notes", { topic: "Administrative notes, access decisions, and operational context." })
    ],
    staffOnlyPermissions(),
    "Staff-only operations."
  );
}

function categoriesForPlan(plan: StructuredServerPlan): CategoryBlueprint[] {
  const categories: CategoryBlueprint[] = [
    startHereCategory(plan),
    announcementsCategory(plan),
    ...educationCategories().filter(() => plan.desiredFeatures.education),
    ...gamingCategories().filter(() => plan.desiredFeatures.gaming),
    ...sensitiveDomainCategories(plan),
    ...creatorCategories(plan),
    ...localCommunityCategories(plan),
    ...openSourceCategories(plan),
    communityCategory(plan),
    supportCategory(plan),
    resourcesCategory(plan),
    ...eventsCategory(plan)
  ];

  if (plan.desiredFeatures.premiumRoles) {
    categories.push(premiumCategory());
  }

  categories.push(staffCategory());
  return categories;
}

function onboardingForPlan(plan: StructuredServerPlan): Blueprint["onboarding"] {
  const options = [
    { label: "General Member", role: "Verified Member", channels: ["general", "announcements", "resources"] },
    { label: "Need Support", role: "Verified Member", channels: ["support", "questions", "faq"] }
  ];

  if (plan.desiredFeatures.education) {
    options.push({ label: "Student", role: "Student", channels: ["lesson-discussion", "assignments", "office-hours"] });
  }

  if (plan.desiredFeatures.gaming) {
    options.push({ label: "Looking For Group", role: "Looking For Group", channels: ["looking-for-group", "tournament-chat"] });
  }

  if (plan.desiredFeatures.premiumRoles) {
    options.push({ label: "Premium Member", role: "Premium Member", channels: ["premium-chat", "premium-resources"] });
  }

  return {
    enabled: plan.desiredFeatures.onboarding,
    welcomeMessage: `Welcome to this ${plan.businessType} community. Choose the roles and channels that match how you plan to participate.`,
    questions: [
      {
        title: "How will you use this server?",
        type: "multi_select",
        options
      }
    ]
  };
}

function serverNameForPlan(plan: StructuredServerPlan): string {
  const base = plan.template.replace(" community", "").replace(" server", "");
  return `${base} Community`;
}

export function blueprintFromPlan(plan: StructuredServerPlan): Blueprint {
  const blueprint: Blueprint = {
    server: {
      name: serverNameForPlan(plan),
      description: `Discord server generated from prompt: ${plan.originalPrompt}`,
      preferredTone: plan.tone,
      communityType: plan.template,
      defaultLocale: "en-US"
    },
    roles: standardRoles(plan),
    categories: categoriesForPlan(plan),
    automod: {
      enabled: plan.desiredFeatures.automod,
      rules: defaultAutomodRules(plan.sensitiveTopics.length > 0)
    },
    onboarding: onboardingForPlan(plan),
    features: {
      starterMessages: true,
      webhooks: plan.desiredFeatures.webhooks,
      automod: plan.desiredFeatures.automod,
      onboarding: plan.desiredFeatures.onboarding,
      supportTickets: plan.desiredFeatures.supportTickets,
      premiumRoles: plan.desiredFeatures.premiumRoles,
      announcementChannels: plan.desiredFeatures.announcementChannels
    }
  };

  return assertValidBlueprint(blueprint);
}

export async function generateBlueprint(options: GenerateBlueprintOptions): Promise<{ plan: StructuredServerPlan; blueprint: Blueprint; suggestedFileName: string }> {
  const plan = await interpretPrompt(options.prompt, options.logger);
  if (isMatternsPatternsPrompt(options.prompt)) {
    return { plan, blueprint: matternsPatternsBlueprint(plan), suggestedFileName: "matternspatterns.yml" };
  }

  const blueprint = blueprintFromPlan(plan);
  const suggestedFileName = `${slugify(plan.template)}.yml`;
  return { plan, blueprint, suggestedFileName };
}

export function generateBlueprintWithoutAi(prompt: string): { plan: StructuredServerPlan; blueprint: Blueprint; suggestedFileName: string } {
  const plan = heuristicInterpretPrompt(prompt);
  if (isMatternsPatternsPrompt(prompt)) {
    return { plan, blueprint: matternsPatternsBlueprint(plan), suggestedFileName: "matternspatterns.yml" };
  }

  const blueprint = blueprintFromPlan(plan);
  return { plan, blueprint, suggestedFileName: `${slugify(plan.template)}.yml` };
}
