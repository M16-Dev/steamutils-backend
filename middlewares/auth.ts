import { createMiddleware } from "@hono/hono/factory";
import type { IdentityEnv } from "@/types/hono.ts";
import { db } from "@/db/index.ts";
import { guildTokens } from "@/db/schema/index.ts";
import { eq } from "drizzle-orm";
import { hashToken, safeCompare } from "@/utils/crypto.ts";
import { config } from "@/config.ts";

export const authMiddleware = createMiddleware<IdentityEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (authHeader.startsWith("Bot ")) {
    const botToken = authHeader.replace("Bot ", "");
    if (!safeCompare(botToken, config.botAccessToken)) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("userRole", "bot");
    return await next();
  }

  if (authHeader.startsWith("Bearer ")) {
    const devToken = authHeader.replace("Bearer ", "");
    const hashed = await hashToken(devToken);

    const result = await db.select({ guildId: guildTokens.guildId }).from(guildTokens).where(eq(guildTokens.tokenHash, hashed)).limit(1);
    if (!result.length) return c.json({ error: "Unauthorized" }, 401);

    c.set("userRole", "developer");
    c.set("tokenGuildId", result[0].guildId);
    return await next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});
