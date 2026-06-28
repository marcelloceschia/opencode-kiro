import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fetchModelsDevData } from "../../src/discovery/models-dev.ts"

function makeFetchResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  }
}

describe("fetchModelsDevData", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns parsed data with extracted fields from a valid response", async () => {
    const mockJson = {
      "anthropic/claude-sonnet-4-6": {
        name: "Claude Sonnet 4.6",
        reasoning: false,
        tool_call: true,
        attachment: true,
        temperature: true,
        structured_output: true,
        limit: { context: 200000, input: 100000, output: 8192 },
        modalities: { input: ["text", "image"], output: ["text"] },
        cost: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
        irrelevant_field: "should be ignored",
      },
      "openai/gpt-4o": {
        name: "GPT-4o",
        tool_call: true,
        limit: { context: 128000, output: 4096 },
        cost: { input: 5.0, output: 15.0 },
      },
    }

    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(mockJson) as unknown as Response)

    const result = await fetchModelsDevData()

    expect(result).toBeDefined()
    expect(result!["anthropic/claude-sonnet-4-6"]).toEqual({
      name: "Claude Sonnet 4.6",
      reasoning: false,
      tool_call: true,
      attachment: true,
      temperature: true,
      structured_output: true,
      limit: { context: 200000, input: 100000, output: 8192 },
      modalities: { input: ["text", "image"], output: ["text"] },
      cost: { input: 3.0, output: 15.0, cache_read: 0.3, cache_write: 3.75 },
    })
    // irrelevant_field should not be present
    expect(result!["anthropic/claude-sonnet-4-6"]).not.toHaveProperty("irrelevant_field")

    expect(result!["openai/gpt-4o"]).toEqual({
      name: "GPT-4o",
      tool_call: true,
      limit: { context: 128000, output: 4096 },
      cost: { input: 5.0, output: 15.0 },
    })
  })

  it("returns undefined on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"))

    const result = await fetchModelsDevData()

    expect(result).toBeUndefined()
  })

  it("returns undefined on non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(null, false, 503) as unknown as Response)

    const result = await fetchModelsDevData()

    expect(result).toBeUndefined()
  })

  it("returns undefined when response body is an array", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse([{ id: "model1" }]) as unknown as Response)

    const result = await fetchModelsDevData()

    expect(result).toBeUndefined()
  })

  it("handles entries with missing optional fields gracefully", async () => {
    const mockJson = {
      "minimal/model": {},
      "partial/model": {
        name: "Partial",
        limit: {},
        modalities: {},
        cost: {},
      },
      "null-value/model": null,
    }

    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(mockJson) as unknown as Response)

    const result = await fetchModelsDevData()

    expect(result).toBeDefined()
    expect(result!["minimal/model"]).toEqual({})
    expect(result!["partial/model"]).toEqual({
      name: "Partial",
      limit: {},
      modalities: {},
      cost: {},
    })
    expect(result!["null-value/model"]).toEqual({})
  })
})
