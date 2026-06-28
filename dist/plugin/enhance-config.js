import { fetchGatewayModels } from "../discovery/gateway-models.js";
import { fetchGatewayCredits } from "../discovery/gateway-credits.js";
import { fetchModelsDevData } from "../discovery/models-dev.js";
import { mapKiroIdToModelsDev } from "../mapping/id-mapper.js";
import { toModelConfig } from "../mapping/capability-mapper.js";
export const DEFAULT_BASE_URL = "http://localhost:8000/v1";
const SERVICE = "opencode-kiro";
function resolveApiKey(raw) {
    if (typeof raw !== "string" || raw.length === 0)
        return process.env["KIRO_API_KEY"];
    const envMatch = raw.match(/^\{env:([^}]+)\}$/);
    if (envMatch)
        return process.env[envMatch[1]] ?? undefined;
    return raw;
}
function formatResetDate(timestamp) {
    return new Date(timestamp * 1000).toISOString().slice(0, 10);
}
export async function enhanceConfig(config, log) {
    const existing = config.provider?.kiro;
    const baseURL = typeof existing?.options?.baseURL === "string" && existing.options.baseURL.length > 0
        ? existing.options.baseURL
        : DEFAULT_BASE_URL;
    const apiKey = resolveApiKey(existing?.options?.apiKey);
    if (!apiKey) {
        await log("debug", `${SERVICE}: no API key configured, skipping discovery`, { baseURL });
        return;
    }
    // Fetch all three data sources in parallel
    const [gatewayModels, gatewayCredits, modelsDevData] = await Promise.all([
        fetchGatewayModels(baseURL, apiKey),
        fetchGatewayCredits(baseURL, apiKey),
        fetchModelsDevData(),
    ]);
    if (!gatewayModels) {
        await log("warn", `${SERVICE}: could not reach gateway, skipping model discovery`, { baseURL });
        return;
    }
    if (!modelsDevData) {
        await log("warn", `${SERVICE}: could not fetch models.dev data, using fallback defaults`);
    }
    // Log and capture credit info
    let creditInfo;
    if (gatewayCredits) {
        const resetDate = formatResetDate(gatewayCredits.next_reset);
        await log("info", `${SERVICE}: ${gatewayCredits.plan}: ${gatewayCredits.credits.used}/${gatewayCredits.credits.limit} credits used, resets ${resetDate}`, { plan: gatewayCredits.plan, credits: gatewayCredits.credits });
        creditInfo = {
            used: gatewayCredits.credits.used,
            limit: gatewayCredits.credits.limit,
        };
    }
    // Build discovered models — skip any the user already defined
    const userDefinedModels = existing?.models ?? {};
    const discoveredModels = {};
    for (const gatewayModel of gatewayModels) {
        const modelId = gatewayModel.id;
        if (modelId in userDefinedModels)
            continue;
        const modelsDevKey = mapKiroIdToModelsDev(modelId);
        const modelsDevEntry = modelsDevKey ? modelsDevData?.[modelsDevKey] : undefined;
        discoveredModels[modelId] = toModelConfig(modelId, modelsDevEntry, creditInfo);
    }
    // Inject into config — user models always win
    config.provider ??= {};
    config.provider.kiro = {
        npm: "@ai-sdk/openai-compatible",
        name: "Kiro",
        ...existing,
        options: {
            ...existing?.options,
            baseURL,
        },
        models: {
            ...discoveredModels,
            ...userDefinedModels,
        },
    };
    await log("info", `${SERVICE}: model discovery complete`, {
        discovered: Object.keys(discoveredModels).length,
        skipped: Object.keys(userDefinedModels).length,
        baseURL,
    });
}
//# sourceMappingURL=enhance-config.js.map