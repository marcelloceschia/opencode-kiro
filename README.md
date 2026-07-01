# opencode-kiro

OpenCode plugin for [Kiro Gateway](https://github.com/jwadow/kiro-gateway) with dynamic model discovery, credit usage display, and reasoning effort variants.

## What it does

At startup, the plugin:

1. Connects to your Kiro Gateway and fetches available models from `GET /v1/models`
2. Fetches your credit usage from `GET /v1/credits`
3. Injects discovered models into the opencode `kiro` provider — with capabilities derived from the gateway response
4. Adds reasoning effort `variants` for models that support them (e.g., low/medium/high/xhigh/max)
5. Estimates cost per 1M tokens from the gateway's `rate_multiplier`
6. Never overwrites models you have already configured explicitly

## Requirements

- OpenCode 1.17.7 or newer
- A running [Kiro Gateway](https://github.com/jwadow/kiro-gateway) instance (defaults to `http://localhost:8000`)
- A Kiro API key (`ksk_*`) — generate one from kiro-cli settings
- For credit usage and cost display: requires [jwadow/kiro-gateway#212](https://github.com/jwadow/kiro-gateway/pull/212) (adds `/v1/credits` endpoint and `ksk_*` API key passthrough)

## Install

Add to `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-kiro@git+https://github.com/marcelloceschia/opencode-kiro.git"]
}
```

## Configuration

The plugin reads from the `provider.kiro` block. All fields are optional.

```json
{
  "plugin": ["opencode-kiro@git+https://github.com/marcelloceschia/opencode-kiro.git"],
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

The plugin discovers all models the gateway exposes and maps capabilities from the response:

- `context_window` → context limit
- `max_output_tokens` → output limit
- `supported_inputs` → attachment support, modalities
- `reasoning_efforts` → reasoning flag + variants (effort levels in model picker)
- `rate_multiplier` → estimated cost per 1M tokens

Model names are annotated with usage info:

```
Claude Opus 4.8 [150/1000 · 2.2x · ≈$0.044/1MT]
```

### Reasoning effort variants

Models with `reasoning_efforts` get variant entries in the model picker:

```
claude-opus-4.8 → low, medium, high, xhigh, max
claude-sonnet-4.6 → low, medium, high, max
```

### Overriding a discovered model

Any model you define under `provider.kiro.models` takes precedence over discovery:

```json
{
  "provider": {
    "kiro": {
      "options": { "apiKey": "{env:KIRO_API_KEY}" },
      "models": {
        "claude-sonnet-4.6": {
          "name": "Sonnet (custom)",
          "limit": { "context": 200000, "output": 32000 }
        }
      }
    }
  }
}
```

## Commands

- `/kiro-quota` — Check your current Kiro credit usage (plan, credits used/limit, overage, reset date)

## Error handling

All network calls degrade gracefully:

- **Gateway unreachable** — skips discovery, logs a warning. Manually configured models still work.
- **Credits endpoint fails** — models still load, but without cost estimates or credit annotations.

## License

MIT
