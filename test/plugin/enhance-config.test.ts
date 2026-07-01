import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { enhanceConfig, DEFAULT_BASE_URL } from "../../src/plugin/enhance-config.ts"
import type { OpenCodeConfig, PluginLogger } from "../../src/types/index.ts"

vi.mock("../../src/discovery/gateway-models.ts", () => ({
  fetchGatewayModels: vi.fn(),
}))
vi.mock("../../src/discovery/gateway-credits.ts", () => ({
  fetchGatewayCredits: vi.fn(),
}))

import { fetchGatewayModels } from "../../src/discovery/gateway-models.ts"
import { fetchGatewayCredits } from "../../src/discovery/gateway-credits.ts"

const mockLog: PluginLogger = vi.fn(async () => {})

const GATEWAY_MODELS = [
  { id: "auto", object: "model" as const, created: 1, owned_by: "kiro", context_window: 1_000_000, max_output_tokens: 64_000, supported_inputs: ["TEXT", "IMAGE"] },
  { id: "claude-sonnet-4.6", object: "model" as const, created: 1, owned_by: "kiro", context_window: 1_000_000, max_output_tokens: 64_000, supported_inputs: ["TEXT", "IMAGE"], reasoning_efforts: ["low", "medium", "high", "max"] },
  { id: "qwen3-coder-next", object: "model" as const, created: 1, owned_by: "kiro", context_window: 256_000, max_output_tokens: 64_000, supported_inputs: ["TEXT"], rate_multiplier: 0.05 },
]

const CREDITS = {
  plan: "KIRO PRO",
  credits: { limit: 1000, used: 150, overage: 0, overage_rate_usd: 0.04 },
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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("sets up provider with default base URL when none configured", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)
    expect(config.provider!["kiro"].options?.baseURL).toBe(DEFAULT_BASE_URL)
  })

  it("uses configured base URL", async () => {
    const config = makeConfig({ options: { baseURL: "https://gateway.example.com/v1", apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)
    expect(config.provider!["kiro"].options?.baseURL).toBe("https://gateway.example.com/v1")
  })

  it("skips setup when no API key", async () => {
    const config = makeConfig({ options: {} })
    await enhanceConfig(config, mockLog)
    expect(config.provider!["kiro"].npm).toBeUndefined()
  })

  it("resolves {env:VAR} style api key", async () => {
    process.env["TEST_KIRO_KEY"] = "ksk_from_env"
    const onResolved = vi.fn()
    const config = makeConfig({ options: { apiKey: "{env:TEST_KIRO_KEY}" } })
    await enhanceConfig(config, mockLog, onResolved)
    expect(onResolved).toHaveBeenCalledWith(DEFAULT_BASE_URL, "ksk_from_env")
    delete process.env["TEST_KIRO_KEY"]
  })

  it("injects discovered models with variants", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const models = config.provider!["kiro"].models!
    expect(models["auto"]).toBeDefined()
    expect(models["claude-sonnet-4.6"]).toBeDefined()

    const sonnet = models["claude-sonnet-4.6"] as Record<string, unknown>
    expect(sonnet["variants"]).toEqual({
      low: { reasoningEffort: "low" },
      medium: { reasoningEffort: "medium" },
      high: { reasoningEffort: "high" },
      max: { reasoningEffort: "max" },
    })
  })

  it("does not override user-defined models", async () => {
    const config = makeConfig({
      options: { apiKey: "ksk_test" },
      models: {
        "claude-sonnet-4.6": { name: "My Custom Sonnet", limit: { context: 50_000, output: 8_000 } },
      },
    })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.name).toBe("My Custom Sonnet")
  })

  it("annotates model names with credit usage", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["claude-sonnet-4.6"]
    expect(model.name).toContain("150/1000")
  })

  it("estimates cost from rate_multiplier", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)

    const model = config.provider!["kiro"].models!["qwen3-coder-next"]
    expect(model.cost?.input).toBeCloseTo(0.001)
    expect(model.cost?.output).toBeCloseTo(0.001)
  })
})
