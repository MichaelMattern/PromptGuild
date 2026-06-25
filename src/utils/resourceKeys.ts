import { slugify } from "./slugify";

export function roleKey(name: string): string {
  return slugify(name);
}

export function categoryKey(name: string): string {
  return slugify(name);
}

export function channelKey(name: string): string {
  return slugify(name);
}

export function messageKey(channelName: string, title: string): string {
  return `${channelKey(channelName)}:${slugify(title)}`;
}

export function webhookKey(channelName: string, name: string): string {
  return `${channelKey(channelName)}:${slugify(name)}`;
}

export function automodRuleKey(name: string): string {
  return slugify(name);
}
