import type { Model as ModelV2, Provider as ProviderV2 } from "@opencode-ai/sdk/v2"
import type { GatewayModel, ModelsDevEntry, CreditInfo, PluginLogger } from "../types/index.js"
import { fetchGatewayModels } from "../discovery/gateway-models.js"
import { fetchGatewayCredits } from "../discovery/gateway-credits.js"
import { fetchModelsDevData } from "../discovery/models-dev.js"
import { mapKiroIdToModelsDev } from "../mapping/id-mapper.js"

function hasReasoning(model: GatewayModel): boolean {
  if (model.reasoning_efforts && model.reasoning_efforts.length > 0) return true
  const schema = model.additional_request_fields_schema
  return schema?.properties?.thinking !== undefined
}

function buildVariants(model: GatewayModel): Record<string, Record<string, unknown>> | undefined {
  const efforts = model.reasoning_efforts
  if (!efforts || efforts.length === 0) return undefined

  const variants: Record<string, Record<string, unknown>> = {}
  for (const effort of efforts) {
    variants[effort] = { reasoningEffort: effort }
  }
  return variants
}

function buildCapabilities(model: GatewayModel) {
  const inputs = model.supported_inputs ?? []
  const hasImage = inputs.some((i) => i.toUpperCase() === "IMAGE")
  const hasText = inputs.some((i) => i.toUpperCase() === "TEXT")
  const hasPdf = inputs.some((i) => i.toUpperCase() === "PDF")
  const hasAudio = inputs.some((i) => i.toUpperCase() === "AUDIO")
  const hasVideo = inputs.some((i) => i.toUpperCase() === "VIDEO")

  return {
    temperature: true,
    reasoning: hasReasoning(model),
    attachment: hasImage || hasPdf,
    toolcall: true,
    input: {
      text: hasText,
      audio: hasAudio,
      image: hasImage,
      video: hasVideo,
      pdf: hasPdf,
    },
    output: {
      text: true,
      audio: false,
      image: false,
      video: false,
      pdf: false,
    },
    interleaved: false as boolean | { field: "reasoning" | "reasoning_content" | "reasoning_details" },
  }
}

function buildCost(entry: ModelsDevEntry | undefined) {
  return {
    input: entry?.cost?.input ?? 0,
    output: entry?.cost?.output ?? 0,
    cache: {
      read: entry?.cost?.cache_read ?? 0,
      write: entry?.cost?.cache_write ?? 0,
    },
  }
}

function formatName(kiroId: string, model: GatewayModel, entry: ModelsDevEntry | undefined, credits: CreditInfo | undefined): string {
  const baseName = entry?.name ?? model.description ?? kiroId
  if (credits) return `${baseName} [${credits.used}/${credits.limit}]`
  return baseName
}

function toModelV2(
  kiroId: string,
  model: GatewayModel,
  provider: ProviderV2,
  entry: ModelsDevEntry | undefined,
  credits: CreditInfo | undefined,
): ModelV2 {
  return {
    id: kiroId,
    providerID: provider.id,
    api: {
      id: provider.id,
      url: provider.options?.["baseURL"] as string ?? "",
      npm: "@ai-sdk/openai-compatible",
    },
    name: formatName(kiroId, model, entry, credits),
    capabilities: buildCapabilities(model),
    cost: buildCost(entry),
    limit: {
      context: model.context_window ?? 200_000,
      output: model.max_output_tokens ?? 64_000,
    },
    status: "active",
    options: {},
    headers: {},
    release_date: "",
    variants: buildVariants(model),
  }
}

export function createProviderHook(
  log: PluginLogger,
  getCredentials: () => { baseURL: string; apiKey: string } | undefined,
) {
  return {
    id: "kiro",
    models: async (provider: ProviderV2) => {
      const creds = getCredentials()
      if (!creds) {
        await log("debug", "opencode-kiro: provider hook — no credentials, skipping")
        return {}
      }

      const [gatewayModels, gatewayCredits, modelsDevData] = await Promise.all([
        fetchGatewayModels(creds.baseURL, creds.apiKey),
        fetchGatewayCredits(creds.baseURL, creds.apiKey),
        fetchModelsDevData(),
      ])

      if (!gatewayModels) {
        await log("warn", "opencode-kiro: provider hook — gateway unreachable")
        return {}
      }

      let creditInfo: CreditInfo | undefined
      if (gatewayCredits) {
        creditInfo = { used: gatewayCredits.credits.used, limit: gatewayCredits.credits.limit }
      }

      const models: Record<string, ModelV2> = {}
      for (const gm of gatewayModels) {
        const devKey = mapKiroIdToModelsDev(gm.id)
        const devEntry = devKey ? modelsDevData?.[devKey] : undefined
        models[gm.id] = toModelV2(gm.id, gm, provider, devEntry, creditInfo)
      }

      await log("info", "opencode-kiro: provider hook — models resolved", {
        count: Object.keys(models).length,
        withVariants: Object.values(models).filter((m) => m.variants).length,
      })

      return models
    },
  }
}
