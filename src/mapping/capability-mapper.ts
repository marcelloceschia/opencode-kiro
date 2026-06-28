import type { ModelConfig, ModelsDevEntry, CreditInfo } from "../types/index.js"

function annotate(name: string, credits: CreditInfo | undefined): string {
  if (credits === undefined) return name
  return `${name} [${credits.used}/${credits.limit}]`
}

export function toModelConfig(
  kiroId: string,
  entry: ModelsDevEntry | undefined,
  credits: CreditInfo | undefined,
): ModelConfig {
  if (entry === undefined) {
    return {
      name: annotate(kiroId, credits),
      reasoning: true,
      tool_call: true,
      limit: { context: 200_000, output: 64_000 },
    }
  }

  const baseName = entry.name ?? kiroId
  const result: ModelConfig = {
    name: annotate(baseName, credits),
  }

  if (entry.reasoning !== undefined) result.reasoning = entry.reasoning
  if (entry.tool_call !== undefined) result.tool_call = entry.tool_call
  if (entry.attachment !== undefined) result.attachment = entry.attachment
  if (entry.temperature !== undefined) result.temperature = entry.temperature

  if (entry.limit !== undefined) {
    const { context, output } = entry.limit
    if (context !== undefined && output !== undefined) {
      result.limit = { context, output }
    }
  }

  if (entry.modalities !== undefined) {
    const { input, output } = entry.modalities
    if (input !== undefined && output !== undefined) {
      type Modality = "text" | "audio" | "image" | "video" | "pdf"
      result.modalities = {
        input: input as Modality[],
        output: output as Modality[],
      }
    }
  }

  if (entry.cost !== undefined) {
    const { input, output, cache_read, cache_write } = entry.cost
    if (input !== undefined && output !== undefined) {
      const cost: ModelConfig["cost"] = { input, output }
      if (cache_read !== undefined) cost!.cache_read = cache_read
      if (cache_write !== undefined) cost!.cache_write = cache_write
      result.cost = cost
    }
  }

  return result
}
