# Troubleshooting

## Missing Access

The bot lacks a required Discord permission or the server feature is unavailable. Reinvite the bot with the required permissions and check its role position.

## Roles Are Not Created Or Updated

Move the bot role above every role it needs to manage. Discord blocks bots from managing roles at or above their highest role.

## AutoMod Rules Fail

AutoMod may require Manage Server permissions and Community features. If setup fails, create the rule manually from Server Settings > Safety Setup or AutoMod.

## Announcement Channels Fail

Announcement channels are only available in supported server configurations. DiscordForge now falls back to normal text channels when a server rejects announcement channels. Enable Community features in Discord if you specifically need announcement channels.

## Ollama Fails

Confirm Ollama is running:

```bash
ollama serve
```

Confirm the model is installed:

```bash
ollama list
```

Then set:

```bash
AI_PROVIDER=ollama
OLLAMA_MODEL=llama3.1:8b
```

If the model returns invalid JSON, try a stronger model or use `AI_PROVIDER=local`.

## Duplicate Resources

Keep `.discordforge/state.json` between reruns. If you delete it, DiscordForge falls back to name matching, but renamed resources may be created again.

## Prompt Generation Fails

Check `OPENAI_API_KEY` and `OPENAI_MODEL`. If OpenAI is unavailable, run:

```bash
npm run generate-blueprint -- --no-ai "Create a server for ..."
```
