# opencode-kiro Plugin Design

## Overview

An opencode plugin that connects to a Kiro Gateway instance, discovers available models dynamically, enriches them with capabilities from models.dev, and surfaces credit usage information.

## Goals

1. Auto-discover models from the gateway's `/v1/models` endpoint
2. Enrich discovered models with capabilities (limits, reasoning, cost, modalities) from models.dev
3. Display credit usage in model names and startup logs
4. Never override user-defined model configurations
5. Work out-of-the-box with `http://localhost:8000` as default gateway

## Non-Goals

- Token refresh / Cognito / SSO authentication (gateway handles this)
- Proxying requests (opencode uses `@ai-sdk/openai-compatible` directly)
- Caching models.dev data across sessions

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  opencode startup                                       │
│    → loads opencode-kiro plugin                         │
│    → plugin.config hook fires                           │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌─────────────┐ ┌─────────────┐
│ GET /v1/models│ │GET /v1/credits│ │models.dev   │
│ (gateway)    │ │ (gateway)    │ │/models.json │
└──────┬───────┘ └──────┬───────┘ └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
              ┌─────────────────┐
              │  Merge & Enrich │
              │  into config    │
              └─────────────────┘
```

## Configuration

The plugin reads from the existing `provider.kiro` block:

```json
{
  "provider": {
    "kiro": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Kiro",
      "options": {
        "baseURL": "http://localhost:8000/v1",
        "apiKey": "{env:KIRO_API_KEY}"
      }
    }
  }
}
```

- **baseURL**: defaults to `http://localhost:8000/v1` if not specified
- **apiKey**: read from `provider.kiro.options.apiKey` (supports `{env:VAR}` syntax)

## Model Discovery

### Gateway Response Shape

```json
{
  "object": "list",
  "data": [
    { "id": "claude-sonnet-4.6", "object": "model", "created": 1782662869, "owned_by": "anthropic" }
  ]
}
```

Validated with zod schema. If the endpoint is unreachable or returns unexpected data, log a warning and skip discovery (don't crash opencode).

### Convention-Based ID Mapping to models.dev

| Kiro ID pattern | models.dev path | Transform |
|---|---|---|
| `claude-*` | `anthropic/claude-*` | dots → dashes |
| `qwen*` | `alibaba/qwen*` | as-is |
| `minimax-*` | `minimax/MiniMax-*` | capitalize, dots → dashes |
| `deepseek-*` | `deepseek/deepseek-*` | prefix `deepseek-`, version normalize |
| `glm-*` | `zhipuai/glm-*` | as-is |
| `auto` | — | bundled defaults (no models.dev lookup) |

The mapping function normalizes the kiro ID, constructs a candidate models.dev key, and looks it up in the fetched `models.json`. If no match is found, fallback defaults apply.

### Fallback Defaults (when models.dev lookup fails)

```typescript
{
  reasoning: true,
  tool_call: true,
  limit: { context: 200_000, output: 64_000 }
}
```

## Capability Enrichment

From the models.dev `models.json` entry, the plugin maps:

| models.dev field | opencode model field |
|---|---|
| `limit.context` | `limit.context` |
| `limit.output` | `limit.output` |
| `reasoning` | `reasoning` |
| `tool_call` | `tool_call` |
| `temperature` | `temperature` |
| `attachment` | `attachment` |
| `modalities.input` | `modalities.input` |
| `modalities.output` | `modalities.output` |
| `cost.input` | `cost.input` |
| `cost.output` | `cost.output` |
| `cost.cache_read` | `cost.cache_read` |
| `cost.cache_write` | `cost.cache_write` |

## Credits Integration

### Endpoint

`GET /v1/credits` with Bearer token returns:

```json
{
  "plan": "KIRO PRO",
  "credits": { "limit": 1000, "used": 150, "overage": 0 },
  "next_reset": 1782864000.0
}
```

### Display

- **Model name annotation**: `"Claude Sonnet 4.6 [150/1000]"` — appended to each discovered model's display name
- **Startup log**: `"Kiro PRO: 150/1000 credits used, resets 2026-07-01"`
- **Graceful degradation**: if credits fetch fails, no annotation, just a warning log

## Config Precedence

1. **User-defined models** in `provider.kiro.models` → never overwritten by discovery
2. **Plugin-discovered models** with models.dev enrichment → added to config
3. **Fallback defaults** for unresolvable models → basic tool_call + reasoning

## Error Handling

- Gateway unreachable → log warning, skip discovery, opencode still works with manually configured models
- models.dev unreachable → log warning, use fallback defaults for all discovered models
- Credits endpoint fails → log warning, skip credit annotation
- Invalid response shapes → zod validation, log and skip gracefully

## Project Structure

```
opencode-kiro/
├── src/
│   ├── index.ts              # Plugin export
│   ├── plugin/
│   │   ├── index.ts          # Plugin factory
│   │   ├── config-hook.ts    # Config hook wiring
│   │   └── enhance-config.ts # Main orchestrator
│   ├── discovery/
│   │   ├── models.ts         # GET /v1/models + validation
│   │   ├── credits.ts        # GET /v1/credits + validation
│   │   └── models-dev.ts     # Fetch + parse models.json
│   ├── mapping/
│   │   ├── id-mapper.ts      # Convention-based ID mapping
│   │   └── capability-mapper.ts # models.dev → opencode model shape
│   └── types/
│       └── index.ts          # Shared types
├── test/
│   ├── discovery/
│   ├── mapping/
│   └── plugin/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── vitest.config.ts
└── README.md
```

## Dependencies

- `@opencode-ai/plugin` — plugin API
- `zod` — response validation
- Dev: `vitest`, `typescript`, `eslint`

## Testing Strategy

- Unit tests for ID mapping rules (exhaustive cases)
- Unit tests for capability mapping
- Integration tests with mocked HTTP responses for gateway + models.dev
- Validation tests for zod schemas against real response shapes

## Usage

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kiro"],
  "provider": {
    "kiro": {
      "options": {
        "baseURL": "https://kiro.cicd.legicconnect.io/v1",
        "apiKey": "{env:KIRO_API_KEY}"
      }
    }
  }
}
```

Minimal config (local gateway, no extra options needed):

```json
{
  "plugin": ["opencode-kiro"],
  "provider": {
    "kiro": {
      "options": {
        "apiKey": "{env:KIRO_API_KEY}"
      }
    }
  }
}
```
