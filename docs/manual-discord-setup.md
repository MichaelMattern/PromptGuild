# Manual Discord Setup

PromptGuild provisions resources after you create the server and bot manually.

For the full first-time setup path with Developer Portal links, bot token handling, OAuth2 invite permissions, role hierarchy, and UI verification, use `docs/discord-bot-setup.md`.

1. Create a Discord server.
2. Enable Developer Mode in Discord.
3. Right-click the server and copy the server ID into `DISCORD_GUILD_ID`.
4. In the Discord Developer Portal, create an application.
5. Add a bot user to the application.
6. Copy the bot token into `DISCORD_TOKEN`.
7. Generate an OAuth2 invite URL with the `bot` scope.
8. Include the permissions documented in `docs/permissions.md`.
9. Invite the bot to the server.
10. Move the bot role above every role PromptGuild should manage.

## Onboarding Fallback

Discord onboarding prompts are not fully exposed as a stable provisioning surface in `discord.js`. PromptGuild writes onboarding questions to the blueprint and logs a manual fallback. Apply them in Discord under Server Settings > Onboarding.
