# opencode-kiro

OpenCode plugin for [Kiro Gateway](https://github.com/jwadow/kiro-gateway) with dynamic model discovery, [models.dev](https://models.dev) capability enrichment, and credit usage display.

## What it does

At startup, the plugin:

1. Connects to your Kiro Gateway and fetches available models from `GET /v1/models`
2. Fetches model capability data (context limits, reasoning, costs, modalities) from models.dev
3. Fetches your credit usage from `GET /v1/credits`
4. Injects discovered models into the opencode `kiro` provider — enriched with capabilities and annotated with credit usage
5. Never overwrites models you have already configured explicitly

## Requirements

- OpenCode 1.17.7 or newer
- A running [Kiro Gateway](https://github.com/jwadow/kiro-gateway) instance (defaults to `http://localhost:8000`)
- A Kiro API key (`ksk_*`) — generate one from kiro-cli settings

## Install

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kiro"]
}
```

## Configuration

The plugin reads from the `provider.kiro` block. All fields are optional.

```json
{
  "plugin": ["opencode-kiro"],
  "provider": {
    "kiro": {
      "options": {
        "baseURL": "https://kiro.example.com/v1",
        "apiKey": "{env:KIRO_API_KEY}"
      }
    }
  }
}
```

| Option | Default | Description |
|---|---|---|
| `options.baseURL` | `http://localhost:8000/v1` | Gateway base URL |
| `options.apiKey` | — | Kiro API key. Supports `{env:VAR}` syntax. |

### Authentication

Set your API key as an environment variable:

```bash
export KIRO_API_KEY=ksk_your_key_here
```

Or inline in the config (not recommended for shared configs):

```json
"apiKey": "ksk_your_key_here"
```

## Model discovery

The plugin discovers all models the gateway exposes and enriches them with data from [models.dev](https://models.dev):

- Context and output token limits
- Reasoning and tool-call support flags
- Temperature and attachment support
- Input/output modalities
- Cost per million tokens

Model names are annotated with your current credit usage:

```
Claude Sonnet 4.6 [150/1000]
```

### Overriding a discovered model

Any model you define under `provider.kiro.models` takes precedence over discovery. The plugin will never overwrite it:

```json
{
  "provider": {
    "kiro": {
      "options": { "apiKey": "{env:KIRO_API_KEY}" },
      "models": {
        "claude-sonnet-4.6": {
          "name": "Sonnet (no credits display)",
          "limit": { "context": 200000, "output": 32000 }
        }
      }
    }
  }
}
```

## Supported model families

Convention-based mapping to models.dev:

| Kiro model prefix | models.dev lab |
|---|---|
| `claude-*` | `anthropic` |
| `qwen*` | `alibaba` |
| `minimax-*` | `minimax` |
| `deepseek-*` | `deepseek` |
| `glm-*` | `zhipuai` |
| `auto` | bundled defaults |

Models that don't match any rule still appear with safe fallback defaults (`reasoning: true`, `tool_call: true`, 200k context).

## Error handling

All network calls degrade gracefully:

- **Gateway unreachable** — skips discovery, logs a warning. Manually configured models still work.
- **models.dev unreachable** — uses fallback defaults for all discovered models.
- **Credits endpoint fails** — model names appear without credit annotation.

## License

MIT
