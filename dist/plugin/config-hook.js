import { enhanceConfig } from "./enhance-config.js";
export function createConfigHook(log, onResolved) {
    return async (config) => {
        await enhanceConfig(config, log, onResolved);
    };
}
//# sourceMappingURL=config-hook.js.map