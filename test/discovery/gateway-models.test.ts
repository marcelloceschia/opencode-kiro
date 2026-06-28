import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchGatewayModels } from "../../src/discovery/gateway-models.ts"

const validResponse = {
  object: "list",
  data: [
    { id: "model-1", object: "model", created: 1700000000, owned_by: "anthropic" },
    { id: "model-2", object: "model", created: 1700000001, owned_by: "openai", description: "A model" },
  ],
}

describe("fetchGatewayModels", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns model array from valid response", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    } as Response)

    const result = await fetchGatewayModels("https://api.example.com/", "test-key")

    expect(result).toEqual(validResponse.data)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.example.com/models")
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-key",
    })
  })

  it("returns undefined on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"))

    const result = await fetchGatewayModels("https://api.example.com", "test-key")

    expect(result).toBeUndefined()
  })

  it("returns undefined on non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
    } as Response)

    const result = await fetchGatewayModels("https://api.example.com", "test-key")

    expect(result).toBeUndefined()
  })

  it("returns undefined on invalid response shape", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: "shape" }),
    } as Response)

    const result = await fetchGatewayModels("https://api.example.com", "test-key")

    expect(result).toBeUndefined()
  })
})
