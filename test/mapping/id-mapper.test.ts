import { describe, it, expect } from "vitest"
import { mapKiroIdToModelsDev } from "../../src/mapping/id-mapper"

describe("mapKiroIdToModelsDev", () => {
  describe("anthropic / claude-", () => {
    it("maps claude-sonnet-4.6", () => {
      expect(mapKiroIdToModelsDev("claude-sonnet-4.6")).toBe("anthropic/claude-sonnet-4-6")
    })

    it("maps claude-opus-4.7", () => {
      expect(mapKiroIdToModelsDev("claude-opus-4.7")).toBe("anthropic/claude-opus-4-7")
    })

    it("maps claude-haiku-4.5", () => {
      expect(mapKiroIdToModelsDev("claude-haiku-4.5")).toBe("anthropic/claude-haiku-4-5")
    })

    it("maps claude-3.7-sonnet", () => {
      expect(mapKiroIdToModelsDev("claude-3.7-sonnet")).toBe("anthropic/claude-3-7-sonnet")
    })
  })

  describe("alibaba / qwen", () => {
    it("maps qwen3-coder-next", () => {
      expect(mapKiroIdToModelsDev("qwen3-coder-next")).toBe("alibaba/qwen3-coder-next")
    })
  })

  describe("minimax / minimax-", () => {
    it("maps minimax-m2.5", () => {
      expect(mapKiroIdToModelsDev("minimax-m2.5")).toBe("minimax/minimax-m2-5")
    })

    it("maps minimax-m2.1", () => {
      expect(mapKiroIdToModelsDev("minimax-m2.1")).toBe("minimax/minimax-m2-1")
    })
  })

  describe("deepseek / deepseek-", () => {
    it("maps deepseek-3.2", () => {
      expect(mapKiroIdToModelsDev("deepseek-3.2")).toBe("deepseek/deepseek-v3-2")
    })
  })

  describe("zhipuai / glm-", () => {
    it("maps glm-5", () => {
      expect(mapKiroIdToModelsDev("glm-5")).toBe("zhipuai/glm-5")
    })
  })

  describe("unknown / special cases", () => {
    it("returns undefined for auto", () => {
      expect(mapKiroIdToModelsDev("auto")).toBeUndefined()
    })

    it("returns undefined for totally-unknown", () => {
      expect(mapKiroIdToModelsDev("totally-unknown")).toBeUndefined()
    })

    it("returns undefined for empty string", () => {
      expect(mapKiroIdToModelsDev("")).toBeUndefined()
    })
  })
})
