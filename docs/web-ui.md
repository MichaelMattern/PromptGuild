# Web UI

PromptGuild includes a local web UI for non-technical setup and review.

Start it:

```bash
npm run ui
```

Open:

```text
http://localhost:5194
```

Configure the port with:

```env
WEB_HOST=127.0.0.1
WEB_PORT=5194
```

## Workflow

1. Fill `.env` from `.env.example`.
2. Start the UI.
3. Confirm the readiness chips show Discord token, guild ID, and AI provider status.
4. If anything is missing, use Environment settings in the UI and save `.env`.
5. Enter a server prompt.
6. Choose an AI provider: Ollama, OpenAI, Local, or Auto.
7. Click Generate Blueprint.
8. Review the Preview tab.
9. Edit YAML if needed.
10. Click Save Blueprint to keep an editable generated blueprint.
11. Click Save Template to keep a reusable starting point in `blueprints/templates`.
12. Click Validate.
13. Click Dry Run.
14. Click Apply to Discord.

## Blueprints and Templates

The picker shows three kinds of files:

- Generated: blueprints created by prompts and saved under `blueprints/generated`.
- Templates: reusable user-created blueprints saved under `blueprints/templates`.
- Examples: read-only seed blueprints shipped with the project under `blueprints/examples`.

When you load an example and click Save Blueprint, the UI saves a generated copy instead of overwriting the example. When you click Save Template, the UI validates the current YAML and stores it as a reusable template.

## Safety

The UI never exposes existing token or API key values. It only reports whether required settings are configured. Secret inputs are write-only: leave them blank to keep the current value, or type a new value to replace it.

By default, the UI binds to `127.0.0.1`. Keep it local when editing secrets. If you intentionally change `WEB_HOST` or `WEB_PORT`, restart `npm run ui` for that change to take effect.

Live setup requires a confirmation dialog and uses the same idempotent state file as the CLI. Reruns update or skip existing resources instead of duplicating tracked resources.

## API

The web UI uses local JSON endpoints:

- `GET /api/status`
- `GET /api/env`
- `GET /api/blueprints`
- `GET /api/blueprint?path=...`
- `POST /api/generate`
- `POST /api/save-blueprint`
- `POST /api/validate`
- `POST /api/dry-run`
- `POST /api/setup`
- `POST /api/env`
- `POST /api/reset-state`

Blueprint paths are restricted to the `blueprints` directory.
