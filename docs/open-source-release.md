# Open-Source Release Checklist

Use this checklist before publishing a fork or release.

- `.env` is not committed.
- `.promptguild/state.json` is not committed.
- Generated private blueprints are not committed unless intentionally shared.
- User-created private templates are not committed unless intentionally shared.
- `npm run build` passes.
- `npm audit --omit=dev` reports no production vulnerabilities.
- `docker compose config` validates.
- `docker build -t promptguild:latest .` passes when Docker is running.
- Example blueprints validate.
- README includes current setup and UI instructions.
- `docs/discord-bot-setup.md` matches the current bot setup flow.
- Discord setup docs warn against self-bots.
- Webhooks and tokens are masked in logs.
- Live setup requires dry-run review and explicit confirmation.
- GitHub Actions CI passes on the public repo.

## Public Repository

Target repository:

```text
https://github.com/MichaelMattern/PromptGuild
```

This local workspace is ready to be initialized as a git repository, committed, and pushed to that remote.

## Recommended First-Time User Path

1. Clone the repo.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Create a Discord application and bot.
5. Invite the bot to a manually created server.
6. Add `DISCORD_TOKEN` and `DISCORD_GUILD_ID`.
7. Install Ollama or set `AI_PROVIDER=local`.
8. Run `npm run ui`.
9. Generate, validate, dry-run, then apply.

## Docker User Path

1. Clone the repo.
2. Run `docker compose up --build`.
3. Open `http://127.0.0.1:5194`.
4. Fill settings from the UI.
5. Generate, validate, dry-run, then apply.

## Publish Commands

Run these after reviewing the final diff:

```bash
git init
git branch -M main
git add .
git commit -m "Initial open-source release"
git remote add origin https://github.com/MichaelMattern/PromptGuild.git
git push -u origin main
```
