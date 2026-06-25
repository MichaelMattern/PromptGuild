import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { MessageRecord, ResourceRecord, StateFile, WebhookRecord } from "./types";

function emptyState(): StateFile {
  return {
    version: 1,
    roles: {},
    categories: {},
    channels: {},
    messages: {},
    webhooks: {},
    automodRules: {},
    updatedAt: new Date().toISOString()
  };
}

export class StateManager {
  private state: StateFile | undefined;

  constructor(private readonly path: string) {}

  async load(): Promise<StateFile> {
    if (this.state) {
      return this.state;
    }

    try {
      const raw = await readFile(this.path, "utf8");
      const parsed = JSON.parse(raw) as StateFile;
      this.state = { ...emptyState(), ...parsed };
      return this.state;
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (code !== "ENOENT") {
        throw error;
      }

      this.state = emptyState();
      return this.state;
    }
  }

  async save(): Promise<void> {
    const state = await this.load();
    state.updatedAt = new Date().toISOString();
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  }

  async reset(): Promise<void> {
    this.state = emptyState();
    await rm(this.path, { force: true });
  }

  async setGuildId(guildId: string): Promise<void> {
    const state = await this.load();
    state.guildId = guildId;
  }

  async setRole(key: string, record: ResourceRecord): Promise<void> {
    const state = await this.load();
    state.roles[key] = record;
  }

  async setCategory(key: string, record: ResourceRecord): Promise<void> {
    const state = await this.load();
    state.categories[key] = record;
  }

  async setChannel(key: string, record: ResourceRecord): Promise<void> {
    const state = await this.load();
    state.channels[key] = record;
  }

  async setMessage(key: string, record: MessageRecord): Promise<void> {
    const state = await this.load();
    state.messages[key] = record;
  }

  async setWebhook(key: string, record: WebhookRecord): Promise<void> {
    const state = await this.load();
    state.webhooks[key] = record;
  }

  async setAutomodRule(key: string, record: ResourceRecord): Promise<void> {
    const state = await this.load();
    state.automodRules[key] = record;
  }
}
