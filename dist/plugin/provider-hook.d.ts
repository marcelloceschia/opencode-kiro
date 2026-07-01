import type { Model as ModelV2, Provider as ProviderV2 } from "@opencode-ai/sdk/v2";
import type { PluginLogger } from "../types/index.js";
export declare function createProviderHook(log: PluginLogger, getCredentials: () => {
    baseURL: string;
    apiKey: string;
} | undefined): {
    id: string;
    models: (provider: ProviderV2) => Promise<Record<string, ModelV2>>;
};
//# sourceMappingURL=provider-hook.d.ts.map