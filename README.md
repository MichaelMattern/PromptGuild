# DiscordForge

DiscordForge turns one natural-language prompt into a validated Discord server blueprint, previews the planned changes, and provisions the server through an official Discord bot using `discord.js` v14.

It does not use a self-bot, automate a normal Discord user account, scrape Discord, or bypass Discord permissions. You create the server and bot application manually, then DiscordForge uses that bot account through the official API.

## What It Builds

- Roles, categories, text channels, voice channels, forum channels, and announcement channels.
- Permission overwrites for public, verified, premium, muted, and staff-only areas.
- Starter messages for welcome, rules, support, FAQ, premium, moderation, and disclaimer channels.
- AutoMod rules where Discord's API supports them.
- Webhooks where requested in the blueprint.
- A persistent state file so reruns update or skip existing resources instead of duplicating them.

## Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in:

```bash
DISCORD_TOKEN=
DISCORD_GUILD_ID=
AI_PROVIDER=ollama
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
DRY_RUN=false
LOG_LEVEL=info
STATE_FILE=.discordforge/state.json
WEB_HOST=127.0.0.1
WEB_PORT=5194
```

AI provider options:

- `AI_PROVIDER=ollama` uses a local Ollama model.
- `AI_PROVIDER=openai` uses OpenAI.
- `AI_PROVIDER=auto` tries Ollama, then OpenAI, then local heuristics.
- `AI_PROVIDER=local` uses deterministic templates only.

See `docs/ai-providers.md` for Ollama setup and model suggestions.

## Create and Link the Discord Bot

Before live setup, create a Discord application, add a bot, invite it to your server, save `DISCORD_TOKEN`, save `DISCORD_GUILD_ID`, and move the bot role above the roles it should manage.

Use the full guide:

```text
docs/discord-bot-setup.md
```

The guide includes Developer Portal links, OAuth2 invite permissions, token handling, role hierarchy, and verification steps.

## Web UI

Start the local app:

```bash
npm run ui
```

Open:

```text
http://localhost:5194
```

The UI supports prompt generation, provider selection, `.env` settings, blueprint preview, YAML editing, reusable templates, validation, dry-run, and live setup. Secret values are write-only in the UI: users can save a token or key, but existing secrets are never displayed. See `docs/web-ui.md`.

## Docker

Run without installing Node.js locally:

```bash
docker compose up --build
```

Open:

```text
http://127.0.0.1:5194
```

The Docker setup stores UI-managed settings in a named volume at `/data/.env`, stores state at `/data/state.json`, and persists generated blueprints in a separate volume. See `docs/docker.md`.

## Manual Discord Setup

1. Create a Discord server manually.
2. Open the Discord Developer Portal.
3. Create an application.
4. Create a bot for the application.
5. Copy the bot token into `.env` as `DISCORD_TOKEN`.
6. Enable the permissions your blueprint needs, especially Manage Roles, Manage Channels, Manage Webhooks, Manage Messages, Moderate Members, and Manage Server.
7. Use OAuth2 URL Generator with the `bot` scope and required bot permissions.
8. Invite the bot to your server.
9. Copy the Discord server ID into `.env` as `DISCORD_GUILD_ID`.
10. Move the bot role above the roles it should create or manage.

## Commands

Generate a blueprint:

```bash
npm run generate-blueprint -- "Create a professional Discord server for a SaaS startup with free users, premium users, support, announcements, and staff moderation."
```

Generate without any AI provider:

```bash
npm run generate-blueprint -- --no-ai "Create a professional Discord server for a SaaS startup with support and premium users."
```

Validate a blueprint:

```bash
npm run validate-blueprint -- --blueprint blueprints/generated/saas-product-community.yml
```

Preview setup:

```bash
npm run setup:dry-run -- --blueprint blueprints/generated/saas-product-community.yml
```

Apply setup:

```bash
npm run setup -- --blueprint blueprints/generated/saas-product-community.yml
```

Reset local state:

```bash
npm run reset-state
```

Production-style start after build:

```bash
npm run build
npm start
```

## Reruns

DiscordForge stores resource IDs in `.discordforge/state.json`. On rerun it checks saved IDs first, then falls back to matching by name. Missing resources are recreated, changed resources are updated, and tracked unchanged resources are skipped.

Do not commit `.discordforge/state.json` if you add webhook tokens or other sensitive metadata in a fork.

## Customizing YAML

Generated files are normal YAML. Edit roles, categories, channels, permissions, starter messages, webhooks, AutoMod rules, onboarding questions, and feature flags before running setup.

Use:

```bash
npm run validate-blueprint -- --blueprint path/to/blueprint.yml
```

before applying changes.

## Blueprints and Templates

DiscordForge keeps blueprint files in three folders:

- `blueprints/generated`: prompt output and edited working blueprints.
- `blueprints/templates`: reusable user-created templates saved from the UI.
- `blueprints/examples`: read-only example blueprints shipped with the project.

Generated and template files are ignored by default so users do not accidentally publish private server plans. Commit only the templates you intentionally want to share.

## Examples

Example blueprints live in `blueprints/examples`:

- `saas-community.yml`
- `gaming-clan.yml`
- `online-course.yml`
- `paid-community.yml`

## Open Source

This project is MIT licensed and prepared for the public repository at:

```text
https://github.com/MichaelMattern/PromptGuild
```

Before publishing a fork, review `docs/open-source-release.md` and keep `.env`, `.discordforge/`, and private generated blueprints out of version control.

## Troubleshooting

- Missing Access: invite the bot with the required permissions and make sure its role is high enough.
- Role not updated: the bot cannot manage roles at or above its highest role.
- AutoMod failed: enable Community features and give the bot Manage Server permissions.
- Announcement channel failed: the server may not support announcement channels.
- Announcement channels: servers without Community features get normal text channels instead.
- Webhook failed: give the bot Manage Webhooks permissions.
- Duplicate resources: run `npm run reset-state` only when you intentionally want DiscordForge to forget previous IDs; otherwise keep the state file.

## Security

- Never commit `.env`.
- Never paste bot tokens into chat, logs, or blueprints.
- Use official bot accounts only.
- Rotate a Discord token immediately if it is exposed.
- Keep webhook URLs masked; they can post to a channel without a bot token.
- Review generated YAML and run dry-run before live setup.
