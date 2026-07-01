function annotate(name, model, credits) {
    const parts = [];
    if (credits !== undefined) {
        parts.push(`${credits.used}/${credits.limit}`);
    }
    const mult = model.rate_multiplier;
    if (typeof mult === "number") {
        parts.push(`${mult}x`);
        const overageRate = credits?.overageRate ?? 0.04;
        const normalRate = overageRate / 2;
        const perMToken = mult * normalRate;
        parts.push(`≈$${perMToken.toFixed(3)}/1MT`);
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
export function toModelConfig(kiroId, model, credits) {
    const baseName = formatName(kiroId, model);
    const result = {
        name: annotate(baseName, model, credits),
        tool_call: true,
        reasoning: hasThinking(model),
    };
    if (model.context_window || model.max_output_tokens) {
        result.limit = {
            context: model.context_window ?? 200_000,
            output: model.max_output_tokens ?? 64_000,
        };
    }
    const supportsImage = model.supported_inputs?.some((i) => i.toUpperCase() === "IMAGE");
    result.attachment = supportsImage ?? false;
    const modalities = deriveModalities(model);
    if (modalities) {
        result.modalities = {
            input: modalities.input,
            output: modalities.output,
        };
    }
    result.temperature = true;
    if (model.rate_multiplier !== undefined && credits) {
        const normalRate = (credits.overageRate ?? 0.04) / 2;
        const perMToken = model.rate_multiplier * normalRate;
        result.cost = { input: perMToken, output: perMToken };
    }
    return result;
}
//# sourceMappingURL=capability-mapper.js.map