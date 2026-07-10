import { rateLimiter } from "@hono-rate-limiter/hono-rate-limiter";
import { RedisStore } from "@hono-rate-limiter/redis";
import type { Context } from "hono";
import type { IdentityEnv } from "@/types/hono.ts";
import { Redis } from "@upstash/redis";
import config from "@/config.ts";

const getStore = (prefix: string) => {
  if (config.runtimeEnv === "standalone") return undefined; // use default

  const client = new Redis({
    url: config.redisUrl,
    token: config.redisToken,
  });

  return new RedisStore<IdentityEnv>({ client, prefix });
};

/**
 * Rate limiter for IP addresses.
 */
export const ipRateLimiter = rateLimiter({
  windowMs: 10 * 1000,
  limit: 30,
  keyGenerator: (c: Context) => c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "",
  skip: (c: Context<IdentityEnv>) => c.get("userRole") === "bot",
  message: "Too many requests, try again later.",
  store: getStore("rl_ip:"),
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
  store: getStore("rl_guild:"),
});
