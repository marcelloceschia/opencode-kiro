import type { Hooks } from "@opencode-ai/plugin"
import type { PluginLogger } from "../types/index.js"
import { enhanceConfig } from "./enhance-config.js"

export function createConfigHook(
  log: PluginLogger,
  onResolved?: (baseURL: string, apiKey: string) => void,
): NonNullable<Hooks["config"]> {
  return async (config) => {
    await enhanceConfig(config, log, onResolved)
  }
}
