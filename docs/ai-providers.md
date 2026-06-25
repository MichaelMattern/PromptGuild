# AI Providers

DiscordForge supports four prompt interpretation modes:

- `AI_PROVIDER=ollama`: use a local Ollama model and fall back to local heuristics if Ollama fails.
- `AI_PROVIDER=openai`: use OpenAI and fall back to local heuristics if OpenAI fails.
- `AI_PROVIDER=auto`: try Ollama first, then OpenAI if `OPENAI_API_KEY` is set, then local heuristics.
- `AI_PROVIDER=local`: use deterministic local heuristics only.

## Ollama

Install Ollama, pull a model, and run the local service:

```bash
ollama pull llama3.1:8b
ollama serve
```

Configure `.env`:

```bash
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=30000
```

Generate a blueprint:

```bash
npm run generate-blueprint -- "Create a server for an online course with instructors, students, assignments, and office hours."
```

Good low-cost model options:

- `llama3.1:8b`
- `llama3.2:3b`
- `mistral:7b`
- `qwen2.5:7b`

Use a smaller model on low-memory machines. If JSON validation fails, try a stronger model or rerun with `AI_PROVIDER=local`.

## OpenAI

OpenAI remains optional:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

## Local Heuristics

For a no-network, no-model fallback:

```bash
AI_PROVIDER=local
```

This mode uses keyword detection and deterministic templates. It is less flexible than a model but still produces valid blueprints.
