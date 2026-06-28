import { z } from "zod";
// --- Gateway Models ---
export const GatewayModelSchema = z.object({
    id: z.string().min(1),
    object: z.literal("model"),
    created: z.number(),
    owned_by: z.string(),
    description: z.string().optional(),
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