export const DEFAULT_BASE_URL = "http://localhost:8000/v1";
const SERVICE = "opencode-kiro";
export function resolveApiKey(raw) {
    if (typeof raw !== "string" || raw.length === 0)
        return process.env["KIRO_API_KEY"];
    const envMatch = raw.match(/^\{env:([^}]+)\}$/);
    if (envMatch)
        return process.env[envMatch[1]] ?? undefined;
    return raw;
}
export async function enhanceConfig(config, log, onResolved) {
    const existing = config.provider?.kiro;
    const baseURL = typeof existing?.options?.baseURL === "string" && existing.options.baseURL.length > 0
        ? existing.options.baseURL
        : DEFAULT_BASE_URL;
    const apiKey = resolveApiKey(existing?.options?.apiKey);
    if (!apiKey) {
        await log("debug", `${SERVICE}: no API key configured, skipping discovery`, { baseURL });
        return;
    }
    onResolved?.(baseURL, apiKey);
    // Only set up the provider shell — model discovery happens in the provider hook
    config.provider ??= {};
    config.provider.kiro = {
        npm: "@ai-sdk/openai-compatible",
        name: "Kiro",
        ...existing,
        options: {
            ...existing?.options,
            baseURL,
        },
    };
    await log("info", `${SERVICE}: provider configured`, { baseURL });
}
//# sourceMappingURL=enhance-config.js.map