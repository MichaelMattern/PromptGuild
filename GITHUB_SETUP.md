# GitHub Setup Suggestions

Use this checklist after the code changes are committed and pushed.

## Suggested Repo Description

Open-source AI agent/tool that turns natural-language prompts into complete Discord server blueprints, previews changes, and provisions servers through an official Discord bot.

## Suggested GitHub Topics

- discord
- discord-bot
- discord-js
- ai-agent
- ai-tools
- server-builder
- community-management
- typescript
- ollama
- openai
- local-ai
- automation
- no-code
- self-hosted

## Suggested First Release

Release name:

```text
PromptGuild v0.1.0 - Public launch
```

Tag:

```text
v0.1.0
```

## Suggested Release Notes for v0.1.0

PromptGuild is now available as an open-source Discord server builder.

Highlights:

- Generate Discord server blueprints from natural-language prompts.
- Preview planned changes with dry-run before applying them.
- Provision roles, categories, channels, permissions, starter messages, AutoMod rules, and webhooks through an official Discord bot.
- Use OpenAI, Ollama/local models, auto provider fallback, or deterministic local templates.
- Run through the CLI, local web UI, or Docker.
- Start from example blueprints for SaaS, gaming, online course, and paid communities.

Safety notes:

- PromptGuild uses official Discord bot APIs only.
- Review generated YAML and dry-run output before live setup.
- Do not commit `.env`, bot tokens, API keys, webhook URLs, state files, or private generated blueprints.

## Suggested Pinned Issues

- Good first issues for new contributors.
- Blueprint template requests.
- Help wanted: tests for blueprint validation and dry-run output.
- Help wanted: README screenshots and web UI polish.
- Roadmap discussion for slash commands and template marketplace ideas.

## Suggested Labels

- `good first issue`
- `help wanted`
- `bug`
- `enhancement`
- `documentation`
- `template`
- `testing`
- `web-ui`
- `cli`
- `discord-api`
- `ai-provider`
- `ollama`
- `openai`
- `docker`
- `security`
- `roadmap`
