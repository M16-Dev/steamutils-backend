import base from "@/config.json" with { type: "json" };
import { z } from "@zod/zod";

export const rawConfig = {
  ...base,
  port: Number(Deno.env.get("PORT")) ?? 8000,
  apiKey: Deno.env.get("API_KEY") as string | undefined,
  appUrl: Deno.env.get("APP_URL") as string | undefined,
  jwtSecret: Deno.env.get("JWT_SECRET") as string | undefined,
  botApiUrl: Deno.env.get("BOT_API_URL") as string | undefined,
  botApiKey: Deno.env.get("BOT_API_KEY") as string | undefined,
};

const PlanSchema = z.object({
  maxCodesPerGuild: z.number().int().positive(),
});

const ConfigSchema = z.object({
  port: z.number().int().positive().max(65535),
  apiKey: z.string(),
  appUrl: z.url().regex(/^https?:\/\/.+/),
  jwtSecret: z.string(),
  plans: z.record(z.string(), PlanSchema),
  botApiUrl: z.url().regex(/^https?:\/\/.+/),
  botApiKey: z.string().min(1),
  maxTokensPerGuild: z.number().int().positive(),
});

const parsed = ConfigSchema.safeParse(rawConfig);
if (!parsed.success) {
  console.error("❌ CRITICAL ERROR: Invalid or missing configuration:");
  console.error(z.prettifyError(parsed.error));
  Deno.exit(1);
}

export const config = parsed.data;

export default config;
