export const templateLabels = [
  "SaaS/product community",
  "Paid membership community",
  "Gaming community",
  "Education/course community",
  "Creator/influencer community",
  "Local/community organization",
  "Open-source/project community",
  "Support/helpdesk server",
  "Sports/analytics community",
  "Finance/trading community",
  "General business community"
] as const;

export type TemplateLabel = (typeof templateLabels)[number];

export interface TemplateSignals {
  template: TemplateLabel;
  keywords: string[];
}

export const templateSignals: TemplateSignals[] = [
  { template: "SaaS/product community", keywords: ["saas", "startup", "product", "bug", "feature", "changelog", "customer"] },
  { template: "Paid membership community", keywords: ["paid", "premium", "membership", "subscriber", "exclusive", "private"] },
  { template: "Gaming community", keywords: ["gaming", "clan", "guild", "lfg", "tournament", "rank", "scrim"] },
  { template: "Education/course community", keywords: ["course", "student", "instructor", "lesson", "assignment", "office hours", "class"] },
  { template: "Creator/influencer community", keywords: ["creator", "influencer", "youtube", "twitch", "patreon", "content"] },
  { template: "Local/community organization", keywords: ["local", "volunteer", "community group", "events", "neighborhood"] },
  { template: "Open-source/project community", keywords: ["open-source", "opensource", "github", "contributors", "maintainers", "repository"] },
  { template: "Support/helpdesk server", keywords: ["support", "helpdesk", "ticket", "customer service"] },
  { template: "Sports/analytics community", keywords: ["sports", "analytics", "betting", "picks", "odds", "model"] },
  { template: "Finance/trading community", keywords: ["finance", "trading", "investing", "crypto", "stocks", "alerts"] }
];

export function detectTemplate(prompt: string): TemplateLabel {
  const haystack = prompt.toLowerCase();

  if (/\b(finance|trading|investing|investment|crypto|stocks?|options|forex)\b/.test(haystack)) {
    return "Finance/trading community";
  }

  if (/\b(sports betting|betting|bets?|odds|parlay|gambling|picks?)\b/.test(haystack)) {
    return "Sports/analytics community";
  }

  const scores = templateSignals.map((signal) => ({
    template: signal.template,
    score: signal.keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0)
  }));

  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].template : "General business community";
}
