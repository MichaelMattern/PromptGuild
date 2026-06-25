export interface ResourceRecord {
  id: string;
  name: string;
  parentId?: string;
  type?: string;
  fingerprint?: string;
  updatedAt: string;
}

export interface MessageRecord extends ResourceRecord {
  channelId: string;
  title: string;
}

export interface WebhookRecord extends ResourceRecord {
  channelId: string;
  purpose?: string;
}

export interface StateFile {
  version: 1;
  guildId?: string;
  roles: Record<string, ResourceRecord>;
  categories: Record<string, ResourceRecord>;
  channels: Record<string, ResourceRecord>;
  messages: Record<string, MessageRecord>;
  webhooks: Record<string, WebhookRecord>;
  automodRules: Record<string, ResourceRecord>;
  updatedAt: string;
}
