import { describe, it, expect } from "vitest"
import { toModelConfig } from "../../src/mapping/capability-mapper"
import type { CreditInfo, GatewayModel } from "../../src/types/index"

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
  describe("gateway data mapping", () => {
    it("maps context_window and max_output_tokens to limits", () => {
      const model = makeGatewayModel({ context_window: 1_000_000, max_output_tokens: 128_000 })
      const result = toModelConfig("claude-opus-4.8", model, undefined)
      expect(result.limit).toEqual({ context: 1_000_000, output: 128_000 })
    })

    it("detects reasoning from reasoning_efforts", () => {
      const model = makeGatewayModel({ reasoning_efforts: ["low", "medium", "high"] })
      const result = toModelConfig("claude-sonnet-4.6", model, undefined)
      expect(result.reasoning).toBe(true)
    })

    it("sets reasoning false when no reasoning_efforts", () => {
      const model = makeGatewayModel()
      const result = toModelConfig("minimax-m2.5", model, undefined)
      expect(result.reasoning).toBe(false)
    })

    it("sets attachment true when IMAGE in supported_inputs", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT", "IMAGE"] })
      const result = toModelConfig("test", model, undefined)
      expect(result.attachment).toBe(true)
    })

    it("sets attachment false when no IMAGE", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT"] })
      const result = toModelConfig("test", model, undefined)
      expect(result.attachment).toBe(false)
    })

    it("derives modalities from supported_inputs", () => {
      const model = makeGatewayModel({ supported_inputs: ["TEXT", "IMAGE"] })
      const result = toModelConfig("test", model, undefined)
      expect(result.modalities).toEqual({ input: ["text", "image"], output: ["text"] })
    })

    it("uses description as name", () => {
      const model = makeGatewayModel({ description: "Claude Sonnet 4.6 model with 1M context" })
      const result = toModelConfig("claude-sonnet-4.6", model, undefined)
      expect(result.name).toContain("Claude Sonnet 4.6 model with 1M context")
    })
  })

  describe("cost estimation from rate_multiplier", () => {
    it("computes cost from rate_multiplier and overage rate", () => {
      const model = makeGatewayModel({ rate_multiplier: 2.2 })
      const credits: CreditInfo = { used: 100, limit: 1000, overageRate: 0.04 }
      const result = toModelConfig("test", model, credits)
      expect(result.cost?.input).toBeCloseTo(0.044)
      expect(result.cost?.output).toBeCloseTo(0.044)
    })

    it("does not set cost when no credits info", () => {
      const model = makeGatewayModel({ rate_multiplier: 1.3 })
      const result = toModelConfig("test", model, undefined)
      expect(result.cost).toBeUndefined()
    })
  })

  describe("credit annotation", () => {
    it("appends credit info and rate to name", () => {
      const model = makeGatewayModel({ rate_multiplier: 2.2 })
      const credits: CreditInfo = { used: 150, limit: 1000, overageRate: 0.04 }
      const result = toModelConfig("test", model, credits)
      expect(result.name).toContain("150/1000")
      expect(result.name).toContain("2.2x")
      expect(result.name).toContain("≈$0.044/1MT")
    })

    it("does not annotate when no credits", () => {
      const model = makeGatewayModel()
      const result = toModelConfig("test", model, undefined)
      expect(result.name).not.toContain("[")
    })
  })

  describe("tool_call always true", () => {
    it("sets tool_call true for all models", () => {
      const model = makeGatewayModel()
      const result = toModelConfig("test", model, undefined)
      expect(result.tool_call).toBe(true)
    })
  })
})
