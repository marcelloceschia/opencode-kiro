import type { ModelsDevData, ModelsDevEntry } from "../types/index.js"

const MODELS_DEV_URL = "https://models.dev/models.json"
const TIMEOUT_MS = 10_000

function extractEntry(raw: unknown): ModelsDevEntry {
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const entry: ModelsDevEntry = {}

  if (typeof r.name === "string") entry.name = r.name
  if (typeof r.reasoning === "boolean") entry.reasoning = r.reasoning
  if (typeof r.tool_call === "boolean") entry.tool_call = r.tool_call
  if (typeof r.attachment === "boolean") entry.attachment = r.attachment
  if (typeof r.temperature === "boolean") entry.temperature = r.temperature
  if (typeof r.structured_output === "boolean") entry.structured_output = r.structured_output

  const lim = r.limit
  if (lim && typeof lim === "object") {
    const l = lim as Record<string, unknown>
    entry.limit = {}
    if (typeof l.context === "number") entry.limit.context = l.context
    if (typeof l.input === "number") entry.limit.input = l.input
    if (typeof l.output === "number") entry.limit.output = l.output
  }

  const mod = r.modalities
  if (mod && typeof mod === "object") {
    const m = mod as Record<string, unknown>
    entry.modalities = {}
    if (Array.isArray(m.input)) entry.modalities.input = m.input.filter((x): x is string => typeof x === "string")
    if (Array.isArray(m.output)) entry.modalities.output = m.output.filter((x): x is string => typeof x === "string")
  }

  const cost = r.cost
  if (cost && typeof cost === "object") {
    const c = cost as Record<string, unknown>
    entry.cost = {}
    if (typeof c.input === "number") entry.cost.input = c.input
    if (typeof c.output === "number") entry.cost.output = c.output
    if (typeof c.cache_read === "number") entry.cost.cache_read = c.cache_read
    if (typeof c.cache_write === "number") entry.cost.cache_write = c.cache_write
  }

  return entry
}

export async function fetchModelsDevData(): Promise<ModelsDevData | undefined> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const response = await fetch(MODELS_DEV_URL, { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return undefined

    const json = await response.json()
    if (!json || typeof json !== "object" || Array.isArray(json)) return undefined

    const result: ModelsDevData = {}
    for (const [key, value] of Object.entries(json as Record<string, unknown>)) {
      result[key] = extractEntry(value)
    }

    return result
  } catch {
    return undefined
  }
}
