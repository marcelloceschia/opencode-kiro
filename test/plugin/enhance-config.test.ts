import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { enhanceConfig, DEFAULT_BASE_URL } from "../../src/plugin/enhance-config.ts"
import type { OpenCodeConfig, PluginLogger } from "../../src/types/index.ts"

// Mock all discovery + mapping modules
vi.mock("../../src/discovery/gateway-models.ts", () => ({
  fetchGatewayModels: vi.fn(),
}))
vi.mock("../../src/discovery/gateway-credits.ts", () => ({
  fetchGatewayCredits: vi.fn(),
}))
vi.mock("../../src/discovery/models-dev.ts", () => ({
  fetchModelsDevData: vi.fn(),
}))

import { fetchGatewayModels } from "../../src/discovery/gateway-models.ts"
import { fetchGatewayCredits } from "../../src/discovery/gateway-credits.ts"
import { fetchModelsDevData } from "../../src/discovery/models-dev.ts"

const mockLog: PluginLogger = vi.fn(async () => {})

const GATEWAY_MODELS = [
  { id: "auto", object: "model" as const, created: 1, owned_by: "kiro", context_window: 1_000_000, max_output_tokens: 64_000, supported_inputs: ["TEXT", "IMAGE"] },
  { id: "claude-sonnet-4.6", object: "model" as const, created: 1, owned_by: "kiro", context_window: 1_000_000, max_output_tokens: 64_000, supported_inputs: ["TEXT", "IMAGE"], additional_request_fields_schema: { type: "object", properties: { thinking: { type: "object" } } } },
  { id: "qwen3-coder-next", object: "model" as const, created: 1, owned_by: "kiro", context_window: 256_000, max_output_tokens: 64_000, supported_inputs: ["TEXT"] },
]

const MODELS_DEV_DATA = {
  "anthropic/claude-sonnet-4-6": {
    name: "Claude Sonnet 4.6",
    reasoning: true,
    tool_call: true,
    attachment: true,
    temperature: true,
    limit: { context: 1_000_000, output: 64_000 },
    modalities: { input: ["text", "image"], output: ["text"] },
    cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
  },
}

const CREDITS = {
  plan: "KIRO PRO",
  credits: { limit: 1000, used: 150, overage: 0 },
  next_reset: 1782864000,
}

function makeConfig(providerKiro?: Record<string, unknown>): OpenCodeConfig {
  const config: OpenCodeConfig = { provider: {} }
  if (providerKiro) {
    config.provider!["kiro"] = providerKiro as OpenCodeConfig["provider"][string]
  }
  return config
}

describe("enhanceConfig", () => {
  beforeEach(() => {
    vi.mocked(fetchGatewayModels).mockResolvedValue(GATEWAY_MODELS)
    vi.mocked(fetchGatewayCredits).mockResolvedValue(CREDITS)
    vi.mocked(fetchModelsDevData).mockResolvedValue(MODELS_DEV_DATA)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("uses default base URL when none configured", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)
    expect(fetchGatewayModels).toHaveBeenCalledWith(DEFAULT_BASE_URL, "ksk_test")
  })

  it("uses configured base URL", async () => {
    const config = makeConfig({ options: { baseURL: "https://gateway.example.com/v1", apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)
    expect(fetchGatewayModels).toHaveBeenCalledWith("https://gateway.example.com/v1", "ksk_test")
  })

  it("skips discovery when no API key", async () => {
    const config = makeConfig({ options: {} })
    await enhanceConfig(config, mockLog)
    expect(fetchGatewayModels).not.toHaveBeenCalled()
  })

  it("resolves {env:VAR} style api key from environment", async () => {
    process.env["TEST_KIRO_KEY"] = "ksk_from_env"
    const config = makeConfig({ options: { apiKey: "{env:TEST_KIRO_KEY}" } })
    await enhanceConfig(config, mockLog)
    expect(fetchGatewayModels).toHaveBeenCalledWith(DEFAULT_BASE_URL, "ksk_from_env")
    delete process.env["TEST_KIRO_KEY"]
  })

  it("injects discovered models into config", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const models = config.provider!["kiro"].models!
    expect(models["auto"]).toBeDefined()
    expect(models["claude-sonnet-4.6"]).toBeDefined()
    expect(models["qwen3-coder-next"]).toBeDefined()
  })

  it("enriches claude model with models.dev capabilities", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.reasoning).toBe(true)
    expect(model.tool_call).toBe(true)
    expect(model.limit?.context).toBe(1_000_000)
    expect(model.cost?.input).toBe(3)
  })

  it("annotates model names with credit usage", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.name).toBe("Claude Sonnet 4.6 [150/1000]")
  })

  it("does not override user-defined models", async () => {
    const config = makeConfig({
      options: { apiKey: "ksk_test" },
      models: {
        "claude-sonnet-4.6": {
          name: "My Custom Sonnet",
          limit: { context: 50_000, output: 8_000 },
        },
      },
    })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.name).toBe("My Custom Sonnet")
    expect(model.limit?.context).toBe(50_000)
  })

  it("skips discovery when gateway unreachable", async () => {
    vi.mocked(fetchGatewayModels).mockResolvedValue(undefined)
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    // Config provider.kiro should not have models injected
    expect(config.provider!["kiro"]?.models).toBeUndefined()
  })

  it("uses fallback defaults when models.dev unavailable", async () => {
    vi.mocked(fetchModelsDevData).mockResolvedValue(undefined)
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    // Fallback: no models.dev enrichment — only defaults
    expect(model.reasoning).toBe(true)
    expect(model.tool_call).toBe(true)
    expect(model.limit?.context).toBe(1_000_000)
  })

  it("skips credit annotation when credits unavailable", async () => {
    vi.mocked(fetchGatewayCredits).mockResolvedValue(undefined)
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.name).toBe("Claude Sonnet 4.6")
    expect(model.name).not.toContain("[")
  })

  it("preserves existing provider config options", async () => {
    const config = makeConfig({
      npm: "@ai-sdk/openai-compatible",
      name: "My Kiro",
      options: { apiKey: "ksk_test", baseURL: "https://custom.gateway/v1" },
    })
    await enhanceConfig(config, mockLog)

    expect(config.provider!["kiro"].name).toBe("My Kiro")
    expect(config.provider!["kiro"].npm).toBe("@ai-sdk/openai-compatible")
  })
})
