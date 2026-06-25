# Blueprint Format

Blueprints are YAML or JSON files validated with Zod before any Discord API mutations.

Reusable templates use the same format as generated blueprints. Save them under `blueprints/templates` from the UI, or place reviewed template files there manually.

Top-level sections:

- `server`: name, description, tone, community type, and locale.
- `roles`: Discord roles to create or update.
- `categories`: Discord categories and nested channels.
- `automod`: AutoMod rules where the API supports them.
- `onboarding`: generated questions for manual onboarding setup.
- `features`: feature flags controlling starter messages, webhooks, AutoMod, onboarding, tickets, premium roles, and announcements.

Permission overwrites use role names and Discord permission flag names:

```yaml
permissions:
  - role: Verified Member
    allow: [ViewChannel, ReadMessageHistory, SendMessages]
    deny: []
```

Starter messages are posted once and then updated on rerun:

```yaml
starterMessages:
  - title: Server Rules
    body: Read and follow the rules.
    pin: true
```

Supported channel types are `text`, `voice`, `forum`, and `announcement`.
