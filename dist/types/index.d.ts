import type { Hooks } from "@opencode-ai/plugin";
import { z } from "zod";
export type OpenCodeConfig = Parameters<NonNullable<Hooks["config"]>>[0];
export type ProviderConfig = NonNullable<OpenCodeConfig["provider"]>[string];
export type ModelConfig = NonNullable<ProviderConfig["models"]>[string];
export type LogLevel = "debug" | "info" | "warn" | "error";
export type PluginLogger = (level: LogLevel, message: string, extra?: Record<string, unknown>) => Promise<void>;
export declare const PromptCachingSchema: z.ZodObject<{
    supported: z.ZodBoolean;
    max_checkpoints: z.ZodOptional<z.ZodNumber>;
    min_tokens_per_checkpoint: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const GatewayModelSchema: z.ZodObject<{
    id: z.ZodString;
    object: z.ZodLiteral<"model">;
    created: z.ZodNumber;
    owned_by: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    context_window: z.ZodOptional<z.ZodNumber>;
    max_output_tokens: z.ZodOptional<z.ZodNumber>;
    rate_multiplier: z.ZodOptional<z.ZodNumber>;
    rate_unit: z.ZodOptional<z.ZodString>;
    supported_inputs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    prompt_caching: z.ZodOptional<z.ZodObject<{
        supported: z.ZodBoolean;
        max_checkpoints: z.ZodOptional<z.ZodNumber>;
        min_tokens_per_checkpoint: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    reasoning_efforts: z.ZodOptional<z.ZodArray<z.ZodString>>;
    additional_request_fields_schema: z.ZodOptional<z.ZodAny>;
}, z.core.$strip>;
export declare const GatewayModelsResponseSchema: z.ZodObject<{
    object: z.ZodLiteral<"list">;
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        object: z.ZodLiteral<"model">;
        created: z.ZodNumber;
        owned_by: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        context_window: z.ZodOptional<z.ZodNumber>;
        max_output_tokens: z.ZodOptional<z.ZodNumber>;
        rate_multiplier: z.ZodOptional<z.ZodNumber>;
        rate_unit: z.ZodOptional<z.ZodString>;
        supported_inputs: z.ZodOptional<z.ZodArray<z.ZodString>>;
        prompt_caching: z.ZodOptional<z.ZodObject<{
            supported: z.ZodBoolean;
            max_checkpoints: z.ZodOptional<z.ZodNumber>;
            min_tokens_per_checkpoint: z.ZodOptional<z.ZodNumber>;
        }, z.core.$strip>>;
        reasoning_efforts: z.ZodOptional<z.ZodArray<z.ZodString>>;
        additional_request_fields_schema: z.ZodOptional<z.ZodAny>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type GatewayModel = z.infer<typeof GatewayModelSchema>;
export type GatewayModelsResponse = z.infer<typeof GatewayModelsResponseSchema>;
export declare const GatewayCreditsSchema: z.ZodObject<{
    plan: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    credits: z.ZodObject<{
        limit: z.ZodNumber;
        used: z.ZodNumber;
        overage: z.ZodNumber;
        overage_charges_usd: z.ZodOptional<z.ZodNumber>;
        overage_rate_usd: z.ZodOptional<z.ZodNumber>;
        overage_cap: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    next_reset: z.ZodNumber;
}, z.core.$strip>;
export type GatewayCredits = z.infer<typeof GatewayCreditsSchema>;
export type ModelsDevData = Record<string, unknown>;
export interface CreditInfo {
    used: number;
    limit: number;
    overageRate?: number;
}
//# sourceMappingURL=index.d.ts.map