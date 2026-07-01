function annotate(name, model, credits) {
    const parts = [];
    if (credits !== undefined) {
        parts.push(`${credits.used}/${credits.limit}`);
    }
    const mult = model.rate_multiplier;
    if (typeof mult === "number") {
        parts.push(`${mult}x`);
        // Estimated $/request: rate_multiplier × overage $/credit (defaults to $0.04)
        const rate = credits?.overageRate ?? 0.04;
        const perReq = mult * rate;
        parts.push(`≈$${perReq.toFixed(3)}/req`);
    }
    if (parts.length === 0)
        return name;
    return `${name} [${parts.join(" · ")}]`;
}
function hasThinking(model) {
    if (model.reasoning_efforts && model.reasoning_efforts.length > 0)
        return true;
    const schema = model.additional_request_fields_schema;
    return schema?.properties?.thinking !== undefined;
}
function deriveModalities(model) {
    const inputs = model.supported_inputs;
    if (!inputs || inputs.length === 0)
        return undefined;
    const inputModalities = [];
    for (const i of inputs) {
        const lower = i.toLowerCase();
        if (lower === "text" || lower === "image" || lower === "audio" || lower === "video" || lower === "pdf") {
            inputModalities.push(lower);
        }
    }
    return { input: inputModalities, output: ["text"] };
}
function formatName(kiroId, model) {
    const desc = model.description;
    if (desc && desc.length > 0 && desc.length < 60)
        return desc;
    return kiroId;
}
export function toModelConfig(kiroId, model, modelsDevEntry, credits) {
    const baseName = modelsDevEntry?.name ?? formatName(kiroId, model);
    const result = {
        name: annotate(baseName, model, credits),
        tool_call: true,
        reasoning: hasThinking(model),
    };
    // Limits: gateway is authoritative
    if (model.context_window || model.max_output_tokens) {
        result.limit = {
            context: model.context_window ?? 200_000,
            output: model.max_output_tokens ?? 64_000,
        };
    }
    // Attachment: IMAGE in supported_inputs
    const supportsImage = model.supported_inputs?.some((i) => i.toUpperCase() === "IMAGE");
    result.attachment = supportsImage ?? false;
    // Modalities from gateway
    const modalities = deriveModalities(model);
    if (modalities) {
        result.modalities = {
            input: modalities.input,
            output: modalities.output,
        };
    }
    // Temperature: default true unless models.dev says otherwise
    result.temperature = modelsDevEntry?.temperature ?? true;
    // Cost from models.dev (gateway doesn't provide dollar pricing)
    if (modelsDevEntry?.cost) {
        const { input, output, cache_read, cache_write } = modelsDevEntry.cost;
        if (input !== undefined && output !== undefined) {
            const cost = { input, output };
            if (cache_read !== undefined)
                cost.cache_read = cache_read;
            if (cache_write !== undefined)
                cost.cache_write = cache_write;
            result.cost = cost;
        }
    }
    // Metadata from models.dev
    if (modelsDevEntry?.release_date) {
        result.release_date = modelsDevEntry.release_date;
    }
    return result;
}
//# sourceMappingURL=capability-mapper.js.map