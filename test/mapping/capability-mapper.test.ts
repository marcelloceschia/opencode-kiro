import { describe, it, expect } from "vitest"
import { toModelConfig } from "../../src/mapping/capability-mapper"
import type { ModelsDevEntry, CreditInfo } from "../../src/types/index"

describe("toModelConfig", () => {
  describe("full entry mapping", () => {
    it("maps all fields when present", () => {
      const entry: ModelsDevEntry = {
        name: "Claude 3.5 Sonnet",
        reasoning: true,
        tool_call: true,
        attachment: true,
        temperature: true,
        limit: { context: 200_000, output: 8_192 },
        modalities: { input: ["text", "image"], output: ["text"] },
        cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
      }
      const result = toModelConfig("claude-3-5-sonnet", entry, undefined)

      expect(result.name).toBe("Claude 3.5 Sonnet")
      expect(result.reasoning).toBe(true)
      expect(result.tool_call).toBe(true)
      expect(result.attachment).toBe(true)
      expect(result.temperature).toBe(true)
      expect(result.limit).toEqual({ context: 200_000, output: 8_192 })
      expect(result.modalities).toEqual({ input: ["text", "image"], output: ["text"] })
      expect(result.cost).toEqual({ input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 })
    })

    it("only includes fields present in entry", () => {
      const entry: ModelsDevEntry = {
        name: "Minimal Model",
        tool_call: false,
      }
      const result = toModelConfig("some-model", entry, undefined)

      expect(result.name).toBe("Minimal Model")
      expect(result.tool_call).toBe(false)
      expect(result.reasoning).toBeUndefined()
      expect(result.attachment).toBeUndefined()
      expect(result.limit).toBeUndefined()
    })
  })

  describe("fallback defaults when entry is undefined", () => {
    it("returns default config with kiroId as name", () => {
      const result = toModelConfig("claude-3-opus", undefined, undefined)

      expect(result.name).toBe("claude-3-opus")
      expect(result.reasoning).toBe(true)
      expect(result.tool_call).toBe(true)
      expect(result.limit).toEqual({ context: 200_000, output: 64_000 })
    })
  })

  describe("credit annotation", () => {
    it("appends credit info to name when credits provided", () => {
      const credits: CreditInfo = { used: 42, limit: 100 }
      const result = toModelConfig("claude-3-opus", undefined, credits)

      expect(result.name).toBe("claude-3-opus [42/100]")
    })

    it("appends credit annotation to entry name", () => {
      const entry: ModelsDevEntry = { name: "GPT-4o" }
      const credits: CreditInfo = { used: 10, limit: 200 }
      const result = toModelConfig("gpt-4o", entry, credits)

      expect(result.name).toBe("GPT-4o [10/200]")
    })

    it("does not annotate when credits is undefined", () => {
      const entry: ModelsDevEntry = { name: "GPT-4o" }
      const result = toModelConfig("gpt-4o", entry, undefined)

      expect(result.name).toBe("GPT-4o")
    })
  })

  describe("name fallback", () => {
    it("falls back to kiroId when entry has no name", () => {
      const entry: ModelsDevEntry = { tool_call: true }
      const result = toModelConfig("my-model-id", entry, undefined)

      expect(result.name).toBe("my-model-id")
    })

    it("falls back to kiroId with credit annotation when entry has no name", () => {
      const entry: ModelsDevEntry = { reasoning: false }
      const credits: CreditInfo = { used: 5, limit: 50 }
      const result = toModelConfig("my-model-id", entry, credits)

      expect(result.name).toBe("my-model-id [5/50]")
    })
  })
})
