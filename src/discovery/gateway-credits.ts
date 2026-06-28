import { GatewayCreditsSchema, type GatewayCredits } from "../types/index.js"

const TIMEOUT_MS = 5_000

export async function fetchGatewayCredits(
  baseURL: string,
  apiKey: string,
): Promise<GatewayCredits | undefined> {
  try {
    const url = `${baseURL.replace(/\/$/, "")}/credits`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) return undefined

    const json = await response.json()
    const parsed = GatewayCreditsSchema.safeParse(json)

    if (!parsed.success) return undefined

    return parsed.data
  } catch {
    return undefined
  }
}
