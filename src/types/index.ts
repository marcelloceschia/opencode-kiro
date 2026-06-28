import type { Hooks } from "@opencode-ai/plugin"
import { z } from "zod"

export type OpenCodeConfig = Parameters<NonNullable<Hooks["config"]>>[0]
export type ProviderConfig = NonNullable<OpenCodeConfig["provider"]>[string]
export type ModelConfig = NonNullable<ProviderConfig["models"]>[string]

export type LogLevel = "debug" | "info" | "warn" | "error"
export type PluginLogger = (
  level: LogLevel,
  message: string,
  extra?: Record<string, unknown>,
) => Promise<void>

// --- Gateway Models ---

export const GatewayModelSchema = z.object({
  id: z.string().min(1),
  object: z.literal("model"),
  created: z.number(),
  owned_by: z.string(),
  description: z.string().optional(),
})

export const GatewayModelsResponseSchema = z.object({
  object: z.literal("list"),
  data: z.array(GatewayModelSchema),
})

export type GatewayModel = z.infer<typeof GatewayModelSchema>
export type GatewayModelsResponse = z.infer<typeof GatewayModelsResponseSchema>

// --- Gateway Credits ---

export const GatewayCreditsSchema = z.object({
  plan: z.string(),
  email: z.string().optional(),
  credits: z.object({
    limit: z.number(),
    used: z.number(),
    overage: z.number(),
    overage_charges_usd: z.number().optional(),
    overage_rate_usd: z.number().optional(),
    overage_cap: z.number().optional(),
  }),
  next_reset: z.number(),
})

export type GatewayCredits = z.infer<typeof GatewayCreditsSchema>

// --- Models.dev ---

export interface ModelsDevEntry {
  name?: string
  reasoning?: boolean
  tool_call?: boolean
  attachment?: boolean
  temperature?: boolean
  structured_output?: boolean
  limit?: {
    context?: number
    input?: number
    output?: number
  }
  modalities?: {
    input?: string[]
    output?: string[]
  }
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
}

export type ModelsDevData = Record<string, ModelsDevEntry>

export interface CreditInfo {
  used: number
  limit: number
}
