# Roadmap

PromptGuild is preparing for its first public open-source release. The roadmap focuses on making Discord server generation safer, easier to review, and more useful for real communities.

## v0.1.0 Public Launch

- Consistent PromptGuild branding across docs, UI, package metadata, Docker, and code-facing messages.
- Clear README, contributor guide, roadmap, launch copy, and GitHub issue templates.
- Local web UI for prompt generation, YAML review, validation, dry-run, and live setup.
- CLI workflows for blueprint generation, validation, dry-run, and setup.
- OpenAI, Ollama, auto, and deterministic local generation modes.
- Example blueprints for SaaS, gaming, online course, and paid communities.

## Near-Term

- Add more reusable blueprint templates for creators, open-source projects, gaming clans, sports analytics, classrooms, events, and support communities.
- Add automated tests for blueprint validation, provider fallback behavior, idempotent provisioning, and dry-run output.
- Improve README and docs with screenshots, diagrams, and clearer Docker quickstarts.
- Improve web UI polish, copy, empty states, and mobile usability.
- Add blueprint export as downloadable YAML from the web UI.
- Document the internal architecture and generation pipeline.

## Later

- Add slash-command support for generating or applying approved templates from Discord.
- Explore a template marketplace concept for community-submitted blueprints.
- Add richer provider configuration and model capability notes.
- Add import/export flows for reusable template packs.
- Add GitHub Actions CI for build, validation, and example blueprint checks.
- Explore hosted bot patterns while keeping self-hosted and local-first workflows supported.

## Principles

- Use official Discord bot APIs only.
- Keep generated plans reviewable before live setup.
- Keep local and deterministic paths available.
- Treat secrets and private server plans as sensitive.
- Make first contributions approachable.
