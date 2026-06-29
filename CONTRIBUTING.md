# Contributing to PromptGuild

Thanks for helping improve PromptGuild.

PromptGuild turns natural-language prompts into Discord server blueprints, previews the planned changes, and provisions the server through an official Discord bot. The project is TypeScript-based, uses `discord.js`, supports OpenAI and Ollama/local generation, and includes both CLI and local web UI workflows.

## Local Setup

1. Install Node.js 20 or newer.
2. Install dependencies:

```bash
npm install
```

3. Copy `.env.example` to `.env`.
4. Create a Discord application and bot if you plan to test live setup. For docs-only, UI-only, template, or validation work, live Discord credentials are usually not required.
5. Follow `docs/discord-bot-setup.md` before applying a blueprint to a real server.

## Run the App

Start the local web UI:

```bash
npm run ui
```

Open:

```text
http://127.0.0.1:5194
```

Generate and validate a blueprint from the CLI:

```bash
npm run generate-blueprint -- "Create a Discord server for an open-source project with maintainers, contributors, support, announcements, and moderation."
npm run validate-blueprint -- --blueprint blueprints/examples/saas-community.yml
```

Preview a setup without changing Discord:

```bash
npm run setup:dry-run -- --blueprint blueprints/examples/saas-community.yml
```

Apply to Discord only after reviewing the dry-run:

```bash
npm run setup -- --blueprint blueprints/generated/your-blueprint.yml
```

## Checks

Run the available project checks before opening a pull request:

```bash
npm run build
npm run validate-blueprint -- --blueprint blueprints/examples/saas-community.yml
```

The current `package.json` does not define separate `lint`, `test`, or `typecheck` scripts. `npm run build` is the TypeScript build/typecheck path for now. If you add linting or tests, update `package.json`, this guide, and the README.

If you touch Docker behavior, also validate:

```bash
docker compose config
```

If Docker is available locally, build the image too:

```bash
npm run docker:build
```

## Code Style Expectations

- Use TypeScript and follow the style already in `src`.
- Keep Discord provisioning idempotent. Reruns should update or skip existing resources instead of duplicating roles, channels, messages, webhooks, or AutoMod rules.
- Use official Discord bot APIs only. Do not add self-bot or user-account automation.
- Validate generated or edited blueprints with the existing Zod schema.
- Keep secrets out of logs, issues, screenshots, examples, and generated blueprints.
- Prefer local/Ollama-compatible generation paths where practical.
- Keep UI copy direct and clear. Avoid promising that an AI-generated server plan is perfect without user review.
- Add or update docs for new commands, environment variables, blueprint fields, provider behavior, or Docker changes.

## Submitting a Pull Request

1. Keep the PR focused on one clear change.
2. Include docs updates when behavior, setup, environment variables, or blueprint format changes.
3. Include screenshots or short screen recordings for UI changes when practical.
4. Explain what you tested in the PR description.
5. Make sure generated private blueprints, `.env`, state files, bot tokens, API keys, and webhook URLs are not committed.

Use `.github/pull_request_template.md` as the checklist.

## Finding Beginner Tasks

Look for issues labeled:

- `good first issue`
- `documentation`
- `template`
- `testing`
- `help wanted`

If issues are not created yet, see `CONTRIBUTOR_TASKS.md` for a curated seed list that maintainers can turn into GitHub issues.

## Suggested First Contributions

- Add new Discord server blueprint templates.
- Add a creator/community Discord server blueprint template.
- Add a gaming clan Discord server blueprint template.
- Add a sports analytics Discord server blueprint template.
- Improve README screenshots and examples.
- Improve web UI copy or design polish.
- Add validation tests.
- Improve Docker docs.
- Add more example prompts.
- Add docs for how PromptGuild works internally.

## Project Safety Principles

PromptGuild should make Discord setup faster, but not less reviewable. Every generated blueprint should be inspectable, every live setup should have a dry-run path, and users should stay in control of bot permissions, secrets, and final application to their servers.
