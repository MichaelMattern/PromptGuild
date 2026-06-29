# PromptGuild

Natural-language Discord server builder for communities, products, creators, and teams.

PromptGuild turns one natural-language prompt into a complete Discord server blueprint, lets users preview the planned changes, and safely provisions the server through an official Discord bot.

It helps community builders move from "we need a server" to a reviewed, repeatable setup plan with roles, channels, permissions, starter content, AutoMod, webhooks, and reusable templates. PromptGuild does not use self-bots, automate normal Discord user accounts, scrape Discord, or bypass Discord permissions.

## What PromptGuild Does

- Generates validated Discord server blueprints from plain English prompts.
- Shows a dry-run preview before making live Discord API changes.
- Provisions servers through `discord.js` v14 and an official bot account.
- Keeps setup idempotent with a local state file so reruns update or skip known resources instead of duplicating them.
- Supports a local web UI, CLI workflows, Docker, OpenAI, Ollama, auto provider selection, and deterministic local generation.

## Why It Is Useful

Discord servers are easy to start and hard to structure well. PromptGuild gives founders, moderators, creators, open-source maintainers, and community operators a consistent way to design server structure, review permissions, and repeat setup across servers without hand-clicking every role and channel.

## Features

- Roles with colors, hierarchy, hoisting, mentionability, and permission flags.
- Categories with text, voice, forum, and announcement channels.
- Permission overwrites for public, member, premium, muted, and staff-only areas.
- Starter messages for welcome, rules, support, FAQ, premium, moderation, and disclaimers.
- AutoMod rules where Discord's API supports them.
- Webhooks for future integrations and automation.
- Discord onboarding question metadata with manual fallback notes.
- Dry-run plans before live setup.
- Blueprint validation with Zod.
- YAML editing and reusable templates in the web UI.
- Example blueprints for SaaS, gaming, online course, and paid communities.

## Demo

Example prompt:

```text
Create a professional Discord server for a SaaS startup with free users, premium users, support, announcements, premium channels, and staff moderation.
```

PromptGuild can generate a blueprint like this:

```yaml
server:
  name: SaaS Startup Community
  description: A professional customer community for a SaaS startup.
  communityType: SaaS/product community
  preferredTone: professional
roles:
  - name: Staff
    permissions:
      - ManageChannels
      - ManageMessages
  - name: Premium
  - name: Free
categories:
  - name: Start Here
    channels:
      - name: announcements
        type: announcement
        starterMessages:
          - title: Welcome
            body: Product updates, release notes, and company announcements live here.
      - name: rules
        type: text
  - name: Support
    channels:
      - name: support
        type: forum
        permissions:
          - role: Staff
            allow:
              - ManageMessages
          - role: Premium
            allow:
              - SendMessages
      - name: office-hours
        type: voice
  - name: Premium
    channels:
      - name: premium-chat
        type: text
        permissions:
          - role: Premium
            allow:
              - ViewChannel
          - role: Free
            deny:
              - ViewChannel
        webhooks:
          - name: Changelog webhook
            purpose: Future product release integration
automod:
  enabled: true
  rules:
    - name: Block spam links
      type: spam_links
      action: block
features:
  starterMessages: true
  webhooks: true
  automod: true
  premiumRoles: true
```

The dry-run preview then shows planned work before anything is applied:

```text
+ create roles: Staff, Premium, Free
+ create categories: Start Here, Support, Premium
+ create text channels: announcements, rules, premium-chat
+ create voice channels: office-hours
+ apply permission overwrites
+ post starter messages
+ create AutoMod rules
+ create webhooks
```

## Quickstart

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in your Discord bot settings.
4. Create a Discord application and bot, invite it to your server, and move the bot role above the roles it should manage. See `docs/discord-bot-setup.md`.
5. Start the local UI:

```bash
npm run ui
```

6. Open `http://127.0.0.1:5194`.
7. Generate a blueprint, review the preview, validate it, run dry-run, then apply it to Discord.

## Environment Variables

```env
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
STATE_FILE=.promptguild/state.json
WEB_HOST=127.0.0.1
WEB_PORT=5194
```

Required for live setup:

- `DISCORD_TOKEN`: bot token from the Discord Developer Portal.
- `DISCORD_GUILD_ID`: server ID for the Discord server you want to provision.

Provider settings:

- `AI_PROVIDER=ollama`: use a local Ollama model.
- `AI_PROVIDER=openai`: use OpenAI.
- `AI_PROVIDER=auto`: try Ollama, then OpenAI if configured, then deterministic local generation.
- `AI_PROVIDER=local`: use deterministic templates without an AI provider.

Existing private state files can still be used by setting `STATE_FILE` to their current path.

## Docker

Run PromptGuild without installing Node.js locally:

```bash
docker compose up --build
```

Open:

```text
http://127.0.0.1:5194
```

The Compose setup stores UI-managed settings in `/data/.env`, stores state at `/data/state.json`, and persists generated blueprints/templates in Docker volumes. Change the host port with `PROMPTGUILD_PORT` if needed.

See `docs/docker.md` for image-only and manual Docker commands.

## Local Development

Common commands:

```bash
npm run ui
npm run build
npm run generate-blueprint -- "Create a community for an open-source project with maintainers, contributors, support, announcements, and moderation."
npm run generate-blueprint -- --no-ai "Create a gaming clan server with raids, voice channels, recruitment, and staff moderation."
npm run validate-blueprint -- --blueprint blueprints/examples/saas-community.yml
npm run setup:dry-run -- --blueprint blueprints/examples/saas-community.yml
```

Apply to Discord only after reviewing the dry-run:

```bash
npm run setup -- --blueprint blueprints/generated/your-blueprint.yml
```

## Supported AI Providers

| Mode | What it does |
| --- | --- |
| `openai` | Uses OpenAI with `OPENAI_API_KEY` and `OPENAI_MODEL`. |
| `ollama` | Uses a local Ollama model through `OLLAMA_BASE_URL` and `OLLAMA_MODEL`. |
| `auto` | Tries Ollama first, then OpenAI if configured, then deterministic local generation. |
| `local` | Uses deterministic local templates and heuristics. No network model required. |

See `docs/ai-providers.md` for Ollama setup and model suggestions.

## Example Use Cases

- SaaS customer community with free and premium user areas.
- Open-source project server with maintainers, contributors, support, and announcements.
- Creator or membership community with gated channels.
- Gaming clan server with raids, squads, recruitment, and voice channels.
- Online course community with instructors, students, assignments, and office hours.
- Sports analytics community with disclaimers, data channels, and future integration webhooks.
- Support/helpdesk server with forum channels and staff workflows.

## Blueprints and Templates

PromptGuild keeps blueprint files in three folders:

- `blueprints/generated`: prompt output and edited working blueprints.
- `blueprints/templates`: reusable user-created templates saved from the UI.
- `blueprints/examples`: read-only example blueprints shipped with the project.

Generated and template files are ignored by default so users do not accidentally publish private server plans. Commit only templates you intentionally want to share.

## Contributing

Contributors are welcome, especially people interested in Discord bots, TypeScript, AI agents, local AI, community tooling, UX writing, templates, validation, and documentation.

Start with `CONTRIBUTING.md`, then check `CONTRIBUTOR_TASKS.md` for curated issue ideas. Good first issues include adding blueprint templates, improving README screenshots/examples, strengthening validation tests, improving Docker docs, polishing UI copy/design, and adding more example prompts.

## Roadmap

The short version:

- More reusable blueprint templates.
- Better validation and test coverage.
- Improved web UI polish and screenshots.
- Export/import workflows for blueprints and templates.
- Slash-command and hosted bot exploration.
- Clearer architecture documentation for contributors.

See `ROADMAP.md` for the full roadmap.

## Security

- Never commit `.env`.
- Never paste bot tokens, API keys, or webhook URLs into issues, logs, screenshots, or generated blueprints.
- Use official Discord bot accounts only.
- Review generated YAML and run dry-run before live setup.

See `SECURITY.md` and `docs/security.md`.

## License

PromptGuild is open source under the MIT License. See `LICENSE`.
