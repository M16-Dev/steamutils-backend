import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { connections } from "@/db/schema/index.ts";
import { and, count, eq } from "drizzle-orm";
import { UserEnv } from "@/types/hono.ts";
import { paginationMiddleware } from "@/middlewares/pagination.ts";
import { requireRole } from "@/middlewares/rbac.ts";

export default new Hono<UserEnv>()
  .get("/", requireRole(["bot"]), ...paginationMiddleware, async (c) => {
    const discordId = c.get("userId");
    const { limit, offset } = c.get("pagination")!;

    const countResult = await db.select({ value: count() }).from(connections).where(eq(connections.discordId, discordId));
    c.set("paginationTotal", countResult[0].value);

    const result = await db.select()
      .from(connections)
      .where(eq(connections.discordId, discordId))
      .limit(limit)
      .offset(offset);

    return c.json(result, 200);
  })
  .delete("/guild/:guildId", requireRole(["bot"]), zValidator("param", z.object({ guildId: z.string().regex(/^\d+$/) })), async (c) => {
    const discordId = c.get("userId");
    const { guildId } = c.req.valid("param");

    const result = await db.delete(connections).where(
      and(
        eq(connections.discordId, discordId),
        eq(connections.guildId, guildId),
      ),
    );

    if (result.rowsAffected === 0) {
      return c.json({ error: "Connection not found." }, 404);
    }

    return c.body(null, 204);
  });
