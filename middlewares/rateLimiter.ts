import { rateLimiter } from "@hono-rate-limiter/hono-rate-limiter";
import type { Context } from "hono";
import type { IdentityEnv } from "@/types/hono.ts";

/**
 * Rate limiter for IP addresses.
 */
export const ipRateLimiter = rateLimiter({
  windowMs: 10 * 1000,
  limit: 30,
  keyGenerator: (c: Context) => c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "",
  message: "Too many requests, try again later.",
});

/**
 * Rate limiter for "developer" user role, based on guildID related with used access token.
 */
export const guildRateLimiter = rateLimiter({
  windowMs: 10 * 1000,
  limit: 10,
  keyGenerator: (c: Context<IdentityEnv>) => c.get("tokenGuildId") ?? "",
  skip: (c: Context<IdentityEnv>) => c.get("userRole") !== "developer",
  message: "Too many requests, try again later.",
});
