import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { connections } from "@/db/schema/index.ts";
import { and, count, eq, gte } from "drizzle-orm";
import type { GuildEnv } from "@/types/hono.ts";
import { paginationMiddleware } from "@/middlewares/pagination.ts";
import { requireRole } from "@/middlewares/rbac.ts";

const DeleteConnectionSchema = z.object({
  discordId: z.string().regex(/^\d+$/),
  guildId: z.string().regex(/^\d+$/),
});

const GetConnectionsSchema = z.object({
  after: z.iso.datetime().optional(),
});

export default new Hono<GuildEnv>()
  .get("/", requireRole(["bot", "developer"]), ...paginationMiddleware, zValidator("query", GetConnectionsSchema), async (c) => {
    const guildId = c.get("guildId");
    const { limit, offset } = c.get("pagination")!;
    const { after } = c.req.valid("query");

    let whereClause = eq(connections.guildId, guildId);
    if (after) {
      whereClause = and(whereClause, gte(connections.createdAt, after))!;
    }

    const countResult = await db.select({ value: count() }).from(connections).where(whereClause);
    c.set("paginationTotal", countResult[0].value);

    const result = await db.select()
      .from(connections)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    return c.json(result, 200);
  })
  .delete("/", requireRole(["bot"]), zValidator("json", DeleteConnectionSchema), async (c) => {
    const { discordId, guildId } = c.req.valid("json");

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
  })
  .get("/discord/:discordId", requireRole(["bot", "developer"]), zValidator("param", z.object({ discordId: z.string().regex(/^\d+$/) })), async (c) => {
    const guildId = c.get("guildId");
    const { discordId } = c.req.valid("param");

    const result = await db.select({ steamId: connections.steamId })
      .from(connections)
      .where(and(eq(connections.guildId, guildId), eq(connections.discordId, discordId)))
      .limit(1);

    if (!result.length) {
      return c.json({ error: "Connection not found." }, 404);
    }

    return c.json({ steamId: result[0].steamId }, 200);
  })
  .get("/steam/:steamId", requireRole(["bot", "developer"]), zValidator("param", z.object({ steamId: z.string().regex(/^\d+$/) })), async (c) => {
    const guildId = c.get("guildId");
    const { steamId } = c.req.valid("param");

    const result = await db.select({ discordId: connections.discordId })
      .from(connections)
      .where(and(eq(connections.guildId, guildId), eq(connections.steamId, steamId)))
      .limit(1);

    if (!result.length) {
      return c.json({ error: "Connection not found." }, 404);
    }

    return c.json({ discordId: result[0].discordId }, 200);
  })
  .delete("/discord/:discordId", requireRole(["bot"]), zValidator("param", z.object({ discordId: z.string().regex(/^\d+$/) })), async (c) => {
    const guildId = c.get("guildId");
    const { discordId } = c.req.valid("param");

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
  })
  .delete("/steam/:steamId", requireRole(["bot"]), zValidator("param", z.object({ steamId: z.string().regex(/^\d+$/) })), async (c) => {
    const guildId = c.get("guildId");
    const { steamId } = c.req.valid("param");

    const result = await db.delete(connections).where(
      and(
        eq(connections.steamId, steamId),
        eq(connections.guildId, guildId),
      ),
    );

    if (result.rowsAffected === 0) {
      return c.json({ error: "Connection not found." }, 404);
    }

    return c.body(null, 204);
  });
