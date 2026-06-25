# Contributing

Thanks for improving DiscordForge.

## Local Setup

```bash
npm install
npm run build
npm run ui
```

Copy `.env.example` to `.env` for local testing. Do not commit `.env`, state files, bot tokens, API keys, or webhook URLs.

## Development Rules

- Use official Discord bot APIs only.
- Do not add self-bot or user-account automation.
- Keep generated blueprints validated with Zod.
- Commit reusable templates only when they are intentionally public and free of private server details.
- Run dry-run before live provisioning changes.
- Keep setup idempotent so reruns do not duplicate roles, channels, messages, webhooks, or AutoMod rules.
- Prefer local/Ollama-compatible generation paths where practical.

## Before Opening a PR

```bash
npm run build
npm audit --omit=dev
npm run validate-blueprint -- --blueprint blueprints/examples/saas-community.yml
```

Add or update docs for new environment variables, commands, or blueprint fields.
