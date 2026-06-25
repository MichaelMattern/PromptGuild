# Security Policy

## Supported Versions

The public repository tracks the latest `main` branch until versioned releases begin.

## Reporting a Vulnerability

Do not open a public issue with bot tokens, API keys, webhook URLs, guild IDs tied to private servers, or screenshots containing secrets.

For now, report security issues privately to the repository owner through GitHub. If a GitHub security advisory workflow is enabled later, use that workflow instead.

## Secret Handling

- Never commit `.env`.
- Never commit `.discordforge/state.json` from a live server.
- Rotate a Discord bot token immediately if it is exposed.
- Rotate OpenAI API keys immediately if exposed.
- Treat Discord webhook URLs as secrets because they can post to channels.
- The web UI intentionally reports whether a secret is configured but does not display existing secret values.

## Bot Safety

DiscordForge uses official Discord bot accounts only. Do not use normal user tokens or self-bots.
