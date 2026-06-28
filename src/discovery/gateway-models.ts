import { GatewayModelsResponseSchema, type GatewayModel } from "../types/index.js"

const TIMEOUT_MS = 5_000

export async function fetchGatewayModels(
  baseURL: string,
  apiKey: string,
): Promise<GatewayModel[] | undefined> {
  try {
    const url = `${baseURL.replace(/\/$/, "")}/models`
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
    const parsed = GatewayModelsResponseSchema.safeParse(json)

    if (!parsed.success) return undefined

    return parsed.data.data
  } catch {
    return undefined
  }
}
