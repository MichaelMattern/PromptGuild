#!/bin/sh
set -eu

ENV_FILE="${ENV_FILE:-/data/.env}"
ENV_DIR="$(dirname "$ENV_FILE")"

mkdir -p "$ENV_DIR" /data /app/blueprints/generated

if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<'EOF'
DISCORD_TOKEN=
DISCORD_GUILD_ID=
AI_PROVIDER=auto
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
DRY_RUN=false
LOG_LEVEL=info
STATE_FILE=/data/state.json
WEB_HOST=0.0.0.0
WEB_PORT=5194
EOF
fi

exec "$@"
