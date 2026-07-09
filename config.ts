import base from "@/config.json" with { type: "json" };
import { z } from "@zod/zod";

export const rawConfig = {
  ...base,
  env: Deno.env.get("ENV") || "production",
  runtimeEnv: Deno.env.get("RUNTIME_ENV"),
  port: Number(Deno.env.get("PORT")) || 8000,
  botAccessToken: Deno.env.get("BOT_ACCESS_TOKEN"),
  apiUrl: Deno.env.get("API_URL"),
  jwtSecret: Deno.env.get("JWT_SECRET"),
  botApiUrl: Deno.env.get("BOT_API_URL"),
  botApiAccessToken: Deno.env.get("BOT_API_ACCESS_TOKEN"),
  discordWebhookUrl: Deno.env.get("DISCORD_WEBHOOK_URL"),
  dbUrl: Deno.env.get("DB_URL") ?? "file:./data/steamutils.db",
  dbToken: Deno.env.get("DB_TOKEN"),
  encryptionKey: Deno.env.get("ENCRYPTION_KEY"),
  redisUrl: Deno.env.get("UPSTASH_REDIS_URL"),
  redisToken: Deno.env.get("UPSTASH_REDIS_TOKEN"),
};

const PlanSchema = z.object({
  maxCodesPerGuild: z.number().int().positive(),
});

const ConfigSchema = z.object({
  env: z.enum(["development", "production"]).default("production"),
  runtimeEnv: z.enum(["standalone", "cloudflare-workers", "deno-deploy"]),
  port: z.number().int().positive().max(65535),
  botAccessToken: z.string().min(32),
  apiUrl: z.url().regex(/^https?:\/\/.+/),
  jwtSecret: z.string().min(32),
  plans: z.record(z.string(), PlanSchema),
  botApiUrl: z.url().regex(/^https?:\/\/.+/),
  botApiAccessToken: z.string().min(32),
  discordWebhookUrl: z.url().regex(/^https?:\/\/.+/),
  maxTokensPerGuild: z.number().int().positive(),
  dbUrl: z.string(),
  dbToken: z.string().min(32).optional(),
  encryptionKey: z.string().min(32),
  redisUrl: z.string().optional(),
  redisToken: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.runtimeEnv !== "standalone") {
    if (!data.dbToken) {
      ctx.addIssue({
        code: "custom",
        message: "dbToken is strictly required in serverless environments (Cloudflare/Deno Deploy)",
        path: ["dbToken"],
      });
    }
    if (!data.redisUrl || !data.redisToken) {
      ctx.addIssue({
        code: "custom",
        message: "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in serverless environments",
        path: ["redisUrl"],
      });
    }
  }
});

const parsed = ConfigSchema.safeParse(rawConfig);
if (!parsed.success) {
  console.error("❌ CRITICAL ERROR: Invalid or missing configuration:");
  console.error(z.prettifyError(parsed.error));
  Deno.exit(1);
}

export const config = parsed.data;

export default config;
