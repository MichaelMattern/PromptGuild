import { Client, GatewayIntentBits } from "discord.js";
import type { Logger } from "../utils/logger";

export async function createDiscordClient(token: string, logger: Logger): Promise<Client> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds]
  });

  client.on("warn", (message) => logger.warn(`Discord client warning: ${message}`));
  client.on("error", (error) => logger.error("Discord client error", error));

  await client.login(token);
  return client;
}

export async function fetchConfiguredGuild(client: Client, guildId: string) {
  const guild = await client.guilds.fetch(guildId);
  await guild.roles.fetch();
  await guild.channels.fetch();
  return guild;
}
