# Docker

DiscordForge can run as a local Docker app. This is the easiest path for users who do not want to install Node.js directly.

## Start

```bash
docker compose up --build
```

Open:

```text
http://127.0.0.1:5194
```

The Compose file publishes the UI only on host loopback by default:

```yaml
ports:
  - "127.0.0.1:${DISCORDFORGE_PORT:-5194}:5194"
```

## Configure

Use the web UI Settings section to enter:

- Discord bot token
- Discord guild ID
- AI provider
- OpenAI key, if used
- Ollama URL/model, if used
- Dry-run and logging settings

The container stores settings in `/data/.env`, backed by the `discordforge-data` Docker volume. Existing secrets are write-only in the UI and are not displayed back.

## Persistence

Docker named volumes are used:

- `discordforge-data`: `.env` and state file.
- `discordforge-generated`: generated blueprints.
- `discordforge-templates`: reusable templates saved from the UI.

Reset everything:

```bash
docker compose down -v
```

## Ollama

When Ollama runs on the host machine, the seeded Docker config uses:

```env
OLLAMA_BASE_URL=http://host.docker.internal:11434
```

On Docker Desktop this usually works directly. On Linux, Compose includes:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Make sure Ollama is reachable from containers. Depending on your Ollama install, you may need to start it with a host binding that Docker can reach.

## Build Image Only

```bash
docker build -t discordforge:latest .
```

Run manually:

```bash
docker run --rm \
  -p 127.0.0.1:5194:5194 \
  -v discordforge-data:/data \
  -v discordforge-generated:/app/blueprints/generated \
  -v discordforge-templates:/app/blueprints/templates \
  discordforge:latest
```
