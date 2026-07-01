import { type Plugin, type PluginInput, tool } from "@opencode-ai/plugin"
import { createRequire } from "node:module"
import type { LogLevel, PluginLogger } from "../types/index.js"
import { createConfigHook } from "./config-hook.js"
import { createProviderHook } from "./provider-hook.js"
import { fetchGatewayCredits } from "../discovery/gateway-credits.js"
import { DEFAULT_BASE_URL, resolveApiKey } from "./enhance-config.js"

const SERVICE = "opencode-kiro"
const nodeRequire = createRequire(import.meta.url)

function packageVersion(): string {
  try {
    const value = nodeRequire("../../package.json") as { version?: unknown }
    return typeof value.version === "string" ? value.version : "unknown"
  } catch {
    return "unknown"
  }
}

function createLogger(client: PluginInput["client"]): PluginLogger {
  return async (level: LogLevel, message: string, extra?: Record<string, unknown>) => {
    try {
      await client.app.log({
        body: {
          service: SERVICE,
          level,
          message,
          extra,
        },
      })
    } catch {
      // Logging is best-effort so configuration can continue.
    }
  }
}

function formatResetDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export const KiroPlugin: Plugin = async ({ client }) => {
  const log = createLogger(client)
  await log("info", "Kiro plugin initialized", { version: packageVersion() })

  let cachedBaseURL: string | undefined
  let cachedApiKey: string | undefined

  return {
    config: createConfigHook(log, (baseURL, apiKey) => {
      cachedBaseURL = baseURL
      cachedApiKey = apiKey
    }),
    provider: createProviderHook(log, () => {
      if (!cachedBaseURL || !cachedApiKey) return undefined
      return { baseURL: cachedBaseURL, apiKey: cachedApiKey }
    }),
    command: {
      "kiro-quota": {
        description: "Check Kiro credit usage",
        template: "Use the kiro_quota tool to check and display my current Kiro credit usage.",
      },
    },
    tool: {
      kiro_quota: tool({
        description: "Fetch current Kiro credit usage (plan, credits used/limit, overage, reset date)",
        args: {},
        async execute() {
          const baseURL = cachedBaseURL ?? DEFAULT_BASE_URL
          const apiKey = cachedApiKey

          if (!apiKey) {
            return "No Kiro API key configured. Set provider.kiro.options.apiKey in your opencode config."
          }

          const credits = await fetchGatewayCredits(baseURL, apiKey)
          if (!credits) {
            return `Could not reach Kiro gateway at ${baseURL}/credits. Check that the gateway is running.`
          }

          const resetDate = formatResetDate(credits.next_reset)
          const lines = [
            `Plan: ${credits.plan}`,
            `Credits: ${credits.credits.used} / ${credits.credits.limit} used`,
            `Overage: ${credits.credits.overage} (charges: $${credits.credits.overage_charges_usd?.toFixed(2) ?? "0.00"})`,
            `Rate: $${credits.credits.overage_rate_usd ?? 0.04}/credit overage`,
            `Resets: ${resetDate}`,
          ]

          return lines.join("\n")
        },
      }),
    },
  }
}
