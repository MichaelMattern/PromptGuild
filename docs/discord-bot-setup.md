# Discord Application and Bot Setup

Use this guide to connect DiscordForge to a Discord server through an official Discord bot account.

DiscordForge does not automate normal Discord user accounts. Each user creates their own Discord application, creates a bot for that application, invites that bot to their own server, and stores the bot token locally.

## 1. Create a Discord Server

Create or choose the Discord server you want DiscordForge to provision.

You must have permission to manage that server and invite bots. For first tests, use a private empty server so dry-runs and live setup are easy to review.

## 2. Enable Developer Mode

1. Open Discord.
2. Go to User Settings > Advanced.
3. Turn on Developer Mode.
4. Right-click your server icon.
5. Click Copy Server ID.
6. Save that value as `DISCORD_GUILD_ID` in the UI Settings screen or in `.env`.

## 3. Create a Discord Application

1. Open the Discord Developer Portal:

```text
https://discord.com/developers/applications
```

2. Click New Application.
3. Name it something recognizable, such as `DiscordForge Builder`.
4. Open the application you created.
5. Copy the Application ID from General Information. You will use it when building the invite link.

## 4. Create the Bot User

1. In your application, open Bot.
2. Click Add Bot if a bot does not already exist.
3. Optional: set the bot avatar and display name.
4. Click Reset Token or View Token.
5. Copy the token once.
6. Save it as `DISCORD_TOKEN` in the UI Settings screen or in `.env`.

Treat the bot token like a password. Do not commit it, paste it into issues, or share screenshots containing it. If it leaks, reset it in the Developer Portal immediately.

DiscordForge currently uses the `Guilds` gateway intent only. Privileged intents are not required for provisioning roles, channels, messages, webhooks, and AutoMod through this tool.

## 5. Configure Bot Install Permissions

Open OAuth2 > URL Generator in the Developer Portal.

Select this scope:

- `bot`

Recommended bot permissions:

- Manage Roles
- Manage Channels
- Manage Webhooks
- Manage Messages
- Moderate Members
- Kick Members
- Ban Members
- Manage Server
- View Audit Log
- View Channels
- Send Messages
- Read Message History
- Embed Links
- Attach Files

Discord will produce an invite URL. If you are building the URL manually, use this shape:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot&permissions=1100317060278
```

For private use, you can leave Public Bot disabled so only the application owner can invite it. For a shared hosted service, each user should still create and invite their own bot unless you intentionally design a hosted multi-tenant bot.

## 6. Invite the Bot to Your Server

1. Open the generated OAuth2 invite URL in your browser.
2. Choose the server you want DiscordForge to manage.
3. Confirm the requested permissions.
4. Complete Discord's authorization screen.
5. Confirm the bot appears in the server member list.

The account authorizing the install must have permission to add bots to that server.

## 7. Move the Bot Role High Enough

After the bot joins:

1. Open Server Settings > Roles.
2. Find the bot's role.
3. Drag it above every role DiscordForge should create, edit, assign, or sort.
4. Save changes.

Discord's role hierarchy prevents bots from managing roles at or above their own highest role. If setup logs mention role hierarchy or missing access, this role position is the first thing to check.

## 8. Start DiscordForge

Node.js:

```bash
npm install
npm run ui
```

Docker:

```bash
docker compose up --build
```

Open the UI:

```text
http://127.0.0.1:5194
```

In Settings, fill:

- `DISCORD_TOKEN`
- `DISCORD_GUILD_ID`
- AI provider settings, or choose `local`

Click Save. The status chips should show that the Discord bot token and guild ID are configured.

## 9. Verify Before Live Setup

1. Generate or load a blueprint.
2. Review the Preview tab.
3. Edit YAML if needed.
4. Click Validate.
5. Click Dry Run.
6. Review the run log.
7. Click Apply to Discord only after the dry-run looks correct.

## Troubleshooting

`Missing Access` usually means the bot was invited without enough permissions or its role is too low.

`Missing Permissions` on role edits usually means the target role is at or above the bot's highest role.

AutoMod errors usually mean the bot needs Manage Server permission or the server's feature set does not support that specific rule.

Announcement channel fallback is normal on servers that do not support announcement channels. DiscordForge creates a normal text channel instead.

Onboarding prompts are saved in the blueprint, but Discord onboarding setup is still a manual step in Server Settings > Onboarding because the stable `discord.js` provisioning surface is limited.

## Official Discord References

- Discord Developer Portal: https://discord.com/developers/applications
- OAuth2 bot authorization: https://discord.com/developers/docs/topics/oauth2#bot-authorization-flow
- Discord permissions and role hierarchy: https://discord.com/developers/docs/topics/permissions#permission-hierarchy
