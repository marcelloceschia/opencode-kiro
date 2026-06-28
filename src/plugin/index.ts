import type { Plugin, PluginInput } from "@opencode-ai/plugin"
import { createRequire } from "node:module"
import type { LogLevel, PluginLogger } from "../types/index.js"
import { createConfigHook } from "./config-hook.js"

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

export const KiroPlugin: Plugin = async ({ client }) => {
  const log = createLogger(client)
  await log("info", "Kiro plugin initialized", { version: packageVersion() })
  return { config: createConfigHook(log) }
}
