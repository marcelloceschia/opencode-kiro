import type { ModelConfig, ModelsDevEntry, CreditInfo, GatewayModel } from "../types/index.js"

function annotate(name: string, credits: CreditInfo | undefined): string {
  if (credits === undefined) return name
  return `${name} [${credits.used}/${credits.limit}]`
}

function hasThinking(model: GatewayModel): boolean {
  if (model.reasoning_efforts && model.reasoning_efforts.length > 0) return true
  const schema = model.additional_request_fields_schema
  return schema?.properties?.thinking !== undefined
}

function deriveModalities(model: GatewayModel): { input: string[]; output: string[] } | undefined {
  const inputs = model.supported_inputs
  if (!inputs || inputs.length === 0) return undefined
  type Modality = "text" | "audio" | "image" | "video" | "pdf"
  const inputModalities: Modality[] = []
  for (const i of inputs) {
    const lower = i.toLowerCase()
    if (lower === "text" || lower === "image" || lower === "audio" || lower === "video" || lower === "pdf") {
      inputModalities.push(lower as Modality)
    }
  }
  return { input: inputModalities, output: ["text"] }
}

function formatName(kiroId: string, model: GatewayModel): string {
  const desc = model.description
  if (desc && desc.length > 0 && desc.length < 60) return desc
  return kiroId
}

export function toModelConfig(
  kiroId: string,
  model: GatewayModel,
  modelsDevEntry: ModelsDevEntry | undefined,
  credits: CreditInfo | undefined,
): ModelConfig {
  const baseName = modelsDevEntry?.name ?? formatName(kiroId, model)
  const result: ModelConfig = {
    name: annotate(baseName, credits),
    tool_call: true,
    reasoning: hasThinking(model),
  }

  // Limits: gateway is authoritative
  if (model.context_window || model.max_output_tokens) {
    result.limit = {
      context: model.context_window ?? 200_000,
      output: model.max_output_tokens ?? 64_000,
    }
  }

  // Attachment: IMAGE in supported_inputs
  const supportsImage = model.supported_inputs?.some((i) => i.toUpperCase() === "IMAGE")
  result.attachment = supportsImage ?? false

  // Modalities from gateway
  const modalities = deriveModalities(model)
  if (modalities) {
    type Modality = "text" | "audio" | "image" | "video" | "pdf"
    result.modalities = {
      input: modalities.input as Modality[],
      output: modalities.output as Modality[],
    }
  }

  // Temperature: default true unless models.dev says otherwise
  result.temperature = modelsDevEntry?.temperature ?? true

  // Cost from models.dev (gateway doesn't provide dollar pricing)
  if (modelsDevEntry?.cost) {
    const { input, output, cache_read, cache_write } = modelsDevEntry.cost
    if (input !== undefined && output !== undefined) {
      const cost: ModelConfig["cost"] = { input, output }
      if (cache_read !== undefined) cost!.cache_read = cache_read
      if (cache_write !== undefined) cost!.cache_write = cache_write
      result.cost = cost
    }
  }

  return result
}
