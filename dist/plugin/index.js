import { createRequire } from "node:module";
import { createConfigHook } from "./config-hook.js";
const SERVICE = "opencode-kiro";
const nodeRequire = createRequire(import.meta.url);
function packageVersion() {
    try {
        const value = nodeRequire("../../package.json");
        return typeof value.version === "string" ? value.version : "unknown";
    }
    catch {
        return "unknown";
    }
}
function createLogger(client) {
    return async (level, message, extra) => {
        try {
            await client.app.log({
                body: {
                    service: SERVICE,
                    level,
                    message,
                    extra,
                },
            });
        }
        catch {
            // Logging is best-effort so configuration can continue.
        }
    };
}
export const KiroPlugin = async ({ client }) => {
    const log = createLogger(client);
    await log("info", "Kiro plugin initialized", { version: packageVersion() });
    return { config: createConfigHook(log) };
};
//# sourceMappingURL=index.js.map