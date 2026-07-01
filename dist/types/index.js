import { z } from "zod";
// --- Gateway Models ---
export const PromptCachingSchema = z.object({
    supported: z.boolean(),
    max_checkpoints: z.number().optional(),
    min_tokens_per_checkpoint: z.number().optional(),
});
export const GatewayModelSchema = z.object({
    id: z.string().min(1),
    object: z.literal("model"),
    created: z.number(),
    owned_by: z.string(),
    description: z.string().optional(),
    context_window: z.number().optional(),
    max_output_tokens: z.number().optional(),
    rate_multiplier: z.number().optional(),
    rate_unit: z.string().optional(),
    supported_inputs: z.array(z.string()).optional(),
    prompt_caching: PromptCachingSchema.optional(),
    additional_request_fields_schema: z.any().optional(),
});
export const GatewayModelsResponseSchema = z.object({
    object: z.literal("list"),
    data: z.array(GatewayModelSchema),
});
// --- Gateway Credits ---
export const GatewayCreditsSchema = z.object({
    plan: z.string(),
    email: z.string().optional(),
    credits: z.object({
        limit: z.number(),
        used: z.number(),
        overage: z.number(),
        overage_charges_usd: z.number().optional(),
        overage_rate_usd: z.number().optional(),
        overage_cap: z.number().optional(),
    }),
    next_reset: z.number(),
});
//# sourceMappingURL=index.js.map