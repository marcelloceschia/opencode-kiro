import { fetchGatewayModels } from "../discovery/gateway-models.js";
import { fetchGatewayCredits } from "../discovery/gateway-credits.js";
import { fetchModelsDevData } from "../discovery/models-dev.js";
import { mapKiroIdToModelsDev } from "../mapping/id-mapper.js";
import { toModelConfig } from "../mapping/capability-mapper.js";
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
function formatResetDate(timestamp) {
    return new Date(timestamp * 1000).toISOString().slice(0, 10);
}
function buildVariants(model) {
    const efforts = model.reasoning_efforts;
    if (!efforts || efforts.length === 0)
        return undefined;
    const variants = {};
    for (const effort of efforts) {
        variants[effort] = { reasoningEffort: effort };
    }
    return variants;
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
    let creditInfo;
    if (gatewayCredits) {
        const resetDate = formatResetDate(gatewayCredits.next_reset);
        await log("info", `${SERVICE}: ${gatewayCredits.plan}: ${gatewayCredits.credits.used}/${gatewayCredits.credits.limit} credits used, resets ${resetDate}`, { plan: gatewayCredits.plan, credits: gatewayCredits.credits });
        creditInfo = {
            used: gatewayCredits.credits.used,
            limit: gatewayCredits.credits.limit,
        };
    }
    const userDefinedModels = existing?.models ?? {};
    const discoveredModels = {};
    for (const gatewayModel of gatewayModels) {
        const modelId = gatewayModel.id;
        if (modelId in userDefinedModels)
            continue;
        const modelsDevKey = mapKiroIdToModelsDev(modelId);
        const modelsDevEntry = modelsDevKey ? modelsDevData?.[modelsDevKey] : undefined;
        const modelConfig = toModelConfig(modelId, gatewayModel, modelsDevEntry, creditInfo);
        // Inject variants for reasoning efforts (v2 feature, not in v1 types but works at runtime)
        const variants = buildVariants(gatewayModel);
        if (variants) {
            modelConfig["variants"] = variants;
        }
        discoveredModels[modelId] = modelConfig;
    }
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