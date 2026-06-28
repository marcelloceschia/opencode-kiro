import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { fetchGatewayCredits } from "../../src/discovery/gateway-credits.ts"

const validCredits = {
  plan: "pro",
  email: "user@example.com",
  credits: {
    limit: 1000,
    used: 250,
    overage: 0,
  },
  next_reset: 1700100000,
}

describe("fetchGatewayCredits", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns credit info from valid response", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => validCredits,
    } as Response)

    const result = await fetchGatewayCredits("https://api.example.com", "test-key")

    expect(result).toEqual(validCredits)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://api.example.com/credits")
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-key",
    })
  })

  it("returns undefined on network error", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"))

    const result = await fetchGatewayCredits("https://api.example.com", "test-key")

    expect(result).toBeUndefined()
  })

  it("returns undefined on non-200 response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
    } as Response)

    const result = await fetchGatewayCredits("https://api.example.com", "test-key")

    expect(result).toBeUndefined()
  })
})
