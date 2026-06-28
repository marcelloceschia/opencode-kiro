import { enhanceConfig } from "./enhance-config.js";
export function createConfigHook(log) {
    return async (config) => {
        await enhanceConfig(config, log);
    };
}
//# sourceMappingURL=config-hook.js.map