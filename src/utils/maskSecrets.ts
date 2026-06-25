const DISCORD_TOKEN_PATTERN = /[MN][A-Za-z\d_-]{23,27}\.[A-Za-z\d_-]{6,7}\.[A-Za-z\d_-]{27,38}/g;
const OPENAI_KEY_PATTERN = /sk-[A-Za-z0-9_-]{20,}/g;
const WEBHOOK_URL_PATTERN = /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g;

export function maskSecrets(value: unknown): string {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return text
    .replace(DISCORD_TOKEN_PATTERN, "[masked-discord-token]")
    .replace(OPENAI_KEY_PATTERN, "[masked-openai-key]")
    .replace(WEBHOOK_URL_PATTERN, "[masked-discord-webhook]");
}
