import type { OpenCodeConfig, PluginLogger } from "../types/index.js";
export declare const DEFAULT_BASE_URL = "http://localhost:8000/v1";
export declare function resolveApiKey(raw: unknown): string | undefined;
export declare function enhanceConfig(config: OpenCodeConfig, log: PluginLogger, onResolved?: (baseURL: string, apiKey: string) => void): Promise<void>;
//# sourceMappingURL=enhance-config.d.ts.map