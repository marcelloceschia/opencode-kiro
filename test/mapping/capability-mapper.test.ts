import { describe, it, expect } from "vitest"
import { toModelConfig } from "../../src/mapping/capability-mapper"
import type { ModelsDevEntry, CreditInfo, GatewayModel } from "../../src/types/index"

function makeGatewayModel(overrides: Partial<GatewayModel> = {}): GatewayModel {
  return {
    id: "test-model",
    object: "model",
    created: 1782934133,
    owned_by: "kiro",
    context_window: 200_000,
    max_output_tokens: 64_000,
    supported_inputs: ["TEXT", "IMAGE"],
    ...overrides,
  }
}

describe("toModelConfig", () => {
  describe("gateway data as primary source", () => {
    it("maps context_window and max_output_tokens to limits", () => {
      const model = makeGatewayModel({ context_window: 1_000_000, max_output_tokens: 128_000 })
      const result = toModelConfig("claude-opus-4.8", model, undefined, undefined)

      expect(result.limit).toEqual({ context: 1_000_000, output: 128_000 })
    })

    it("detects reasoning from additional_request_fields_schema.thinking", () => {
      const model = makeGatewayModel({
        additional_request_fields_schema: {
          type: "object",
          properties: { thinking: { type: "object" } },
        },
      })
      const result = toModelConfig("claude-sonnet-4.6", model, undefined, undefined)

      expect(result.reasoning).toBe(true)
    })

    it("sets reasoning false when no thinking schema", () => {
      const model = makeGatewayModel({ additional_request_fields_schema: undefined })
      const result = toModelConfig("minimax-m2.5", model, undefined, undefined)

      expect(result.reasoning).toBe(false)
    })

    it("sets attachment true when IMAGE in supported_inputs", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT", "IMAGE"] })
      const result = toModelConfig("test", model, undefined, undefined)

      expect(result.attachment).toBe(true)
    })

    it("sets attachment false when no IMAGE", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT"] })
      const result = toModelConfig("test", model, undefined, undefined)

      expect(result.attachment).toBe(false)
    })

    it("derives modalities from supported_inputs", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT", "IMAGE"] })
      const result = toModelConfig("test", model, undefined, undefined)

      expect(result.modalities).toEqual({ input: ["text", "image"], output: ["text"] })
    })

    it("uses description as name", () => {
      const model = makeGatewayModel({ description: "Claude Sonnet 4.6 model with 1M context window" })
      const result = toModelConfig("claude-sonnet-4.6", model, undefined, undefined)

      expect(result.name).toBe("Claude Sonnet 4.6 model with 1M context window")
    })

    it("falls back to kiroId when description is too long", () => {
      const model = makeGatewayModel({ description: "A".repeat(61) })
      const result = toModelConfig("claude-sonnet-4.6", model, undefined, undefined)

      expect(result.name).toBe("claude-sonnet-4.6")
    })
  })

  describe("models.dev enrichment", () => {
    it("prefers models.dev name over gateway description", () => {
      const model = makeGatewayModel({ description: "Some desc" })
      const entry: ModelsDevEntry = { name: "Claude Sonnet 4.6" }
      const result = toModelConfig("claude-sonnet-4.6", model, entry, undefined)

      expect(result.name).toBe("Claude Sonnet 4.6")
    })

    it("merges cost from models.dev", () => {
      const model = makeGatewayModel()
      const entry: ModelsDevEntry = {
        cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
      }
      const result = toModelConfig("test", model, entry, undefined)

      expect(result.cost).toEqual({ input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 })
    })

    it("uses models.dev temperature value", () => {
      const model = makeGatewayModel()
      const entry: ModelsDevEntry = { temperature: false }
      const result = toModelConfig("test", model, entry, undefined)

      expect(result.temperature).toBe(false)
    })
  })

  describe("credit annotation", () => {
    it("appends credit info to name", () => {
      const model = makeGatewayModel({ description: "Claude Opus 4.7" })
      const credits: CreditInfo = { used: 150, limit: 1000 }
      const result = toModelConfig("claude-opus-4.7", model, undefined, credits)

      expect(result.name).toBe("Claude Opus 4.7 [150/1000]")
    })

    it("does not annotate when credits is undefined", () => {
      const model = makeGatewayModel({ description: "Claude Opus 4.7" })
      const result = toModelConfig("claude-opus-4.7", model, undefined, undefined)

      expect(result.name).toBe("Claude Opus 4.7")
    })
  })

  describe("tool_call always true", () => {
    it("sets tool_call true for all models", () => {
      const model = makeGatewayModel()
      const result = toModelConfig("test", model, undefined, undefined)

      expect(result.tool_call).toBe(true)
    })
  })
})
