import { fetchGatewayModels } from "../discovery/gateway-models.js";
import { fetchGatewayCredits } from "../discovery/gateway-credits.js";
import { fetchModelsDevData } from "../discovery/models-dev.js";
import { mapKiroIdToModelsDev } from "../mapping/id-mapper.js";
function hasReasoning(model) {
    if (model.reasoning_efforts && model.reasoning_efforts.length > 0)
        return true;
    const schema = model.additional_request_fields_schema;
    return schema?.properties?.thinking !== undefined;
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
function buildCapabilities(model) {
    const inputs = model.supported_inputs ?? [];
    const hasImage = inputs.some((i) => i.toUpperCase() === "IMAGE");
    const hasText = inputs.some((i) => i.toUpperCase() === "TEXT");
    const hasPdf = inputs.some((i) => i.toUpperCase() === "PDF");
    const hasAudio = inputs.some((i) => i.toUpperCase() === "AUDIO");
    const hasVideo = inputs.some((i) => i.toUpperCase() === "VIDEO");
    return {
        temperature: true,
        reasoning: hasReasoning(model),
        attachment: hasImage || hasPdf,
        toolcall: true,
        input: {
            text: hasText,
            audio: hasAudio,
            image: hasImage,
            video: hasVideo,
            pdf: hasPdf,
        },
        output: {
            text: true,
            audio: false,
            image: false,
            video: false,
            pdf: false,
        },
        interleaved: false,
    };
}
function buildCost(entry) {
    return {
        input: entry?.cost?.input ?? 0,
        output: entry?.cost?.output ?? 0,
        cache: {
            read: entry?.cost?.cache_read ?? 0,
            write: entry?.cost?.cache_write ?? 0,
        },
    };
}
function formatName(kiroId, model, entry, credits) {
    const baseName = entry?.name ?? model.description ?? kiroId;
    if (credits)
        return `${baseName} [${credits.used}/${credits.limit}]`;
    return baseName;
}
function toModelV2(kiroId, model, provider, entry, credits) {
    return {
        id: kiroId,
        providerID: provider.id,
        api: {
            id: provider.id,
            url: provider.options?.["baseURL"] ?? "",
            npm: "@ai-sdk/openai-compatible",
        },
        name: formatName(kiroId, model, entry, credits),
        capabilities: buildCapabilities(model),
        cost: buildCost(entry),
        limit: {
            context: model.context_window ?? 200_000,
            output: model.max_output_tokens ?? 64_000,
        },
        status: "active",
        options: {},
        headers: {},
        release_date: "",
        variants: buildVariants(model),
    };
}
export function createProviderHook(log, getCredentials) {
    return {
        id: "kiro",
        models: async (provider) => {
            const creds = getCredentials();
            if (!creds) {
                await log("debug", "opencode-kiro: provider hook — no credentials, skipping");
                return {};
            }
            const [gatewayModels, gatewayCredits, modelsDevData] = await Promise.all([
                fetchGatewayModels(creds.baseURL, creds.apiKey),
                fetchGatewayCredits(creds.baseURL, creds.apiKey),
                fetchModelsDevData(),
            ]);
            if (!gatewayModels) {
                await log("warn", "opencode-kiro: provider hook — gateway unreachable");
                return {};
            }
            let creditInfo;
            if (gatewayCredits) {
                creditInfo = { used: gatewayCredits.credits.used, limit: gatewayCredits.credits.limit };
            }
            const models = {};
            for (const gm of gatewayModels) {
                const devKey = mapKiroIdToModelsDev(gm.id);
                const devEntry = devKey ? modelsDevData?.[devKey] : undefined;
                const modelV2 = toModelV2(gm.id, gm, provider, devEntry, creditInfo);
                models[gm.id] = modelV2;
                await log("debug", `opencode-kiro: model "${gm.id}"`, {
                    reasoning: modelV2.capabilities.reasoning,
                    variants: modelV2.variants,
                    reasoning_efforts: gm.reasoning_efforts,
                    attachment: modelV2.capabilities.attachment,
                    input: modelV2.capabilities.input,
                    limit: modelV2.limit,
                });
            }
            await log("info", "opencode-kiro: provider hook — models resolved", {
                count: Object.keys(models).length,
                withVariants: Object.values(models).filter((m) => m.variants).length,
                modelIds: Object.keys(models),
            });
            return models;
        },
    };
}
//# sourceMappingURL=provider-hook.js.map