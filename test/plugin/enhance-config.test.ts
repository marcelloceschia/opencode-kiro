import { describe, it, expect, vi, afterEach } from "vitest"
import { enhanceConfig, DEFAULT_BASE_URL } from "../../src/plugin/enhance-config.ts"
import type { OpenCodeConfig, PluginLogger } from "../../src/types/index.ts"

const mockLog: PluginLogger = vi.fn(async () => {})

function makeConfig(providerKiro?: Record<string, unknown>): OpenCodeConfig {
  const config: OpenCodeConfig = { provider: {} }
  if (providerKiro) {
    config.provider!["kiro"] = providerKiro as OpenCodeConfig["provider"][string]
  }
  return config
}

describe("enhanceConfig", () => {
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
    expect(config.provider!["kiro"].models).toBeUndefined()
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

  it("calls onResolved with baseURL and apiKey", async () => {
    const onResolved = vi.fn()
    const config = makeConfig({ options: { baseURL: "https://custom/v1", apiKey: "ksk_abc" } })
    await enhanceConfig(config, mockLog, onResolved)
    expect(onResolved).toHaveBeenCalledWith("https://custom/v1", "ksk_abc")
  })

  it("does not inject models (provider hook handles that)", async () => {
    const config = makeConfig({ options: { apiKey: "ksk_test" } })
    await enhanceConfig(config, mockLog)
    expect(config.provider!["kiro"].models).toBeUndefined()
  })

  it("preserves existing provider config", async () => {
    const config = makeConfig({
      npm: "@ai-sdk/openai-compatible",
      name: "My Kiro",
      options: { apiKey: "ksk_test", baseURL: "https://custom.gateway/v1" },
    })
    await enhanceConfig(config, mockLog)
    expect(config.provider!["kiro"].name).toBe("My Kiro")
    expect(config.provider!["kiro"].npm).toBe("@ai-sdk/openai-compatible")
  })

  it("preserves user-defined models without overriding", async () => {
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
})
