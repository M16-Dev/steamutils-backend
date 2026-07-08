import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
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
  .get(
    "/",
    describeRoute({
      tags: ["Connections", "Public"],
      summary: "Get all connections",
      description: "Retrieve a paginated list of all Steam-Discord connections for the current guild.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    ...paginationMiddleware,
    validator("query", GetConnectionsSchema),
    async (c) => {
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
    },
  )
  .delete(
    "/",
    describeRoute({
      tags: ["Connections"],
      summary: "Delete connection",
      description: "Delete a specific connection by Discord ID and Guild ID.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("json", DeleteConnectionSchema),
    async (c) => {
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
    },
  )
  .get(
    "/discord/:discordId",
    describeRoute({
      tags: ["Connections", "Public"],
      summary: "Get Steam connection by Discord ID",
      description: "Retrieve the linked Steam ID for a given Discord user.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    validator("param", z.object({ discordId: z.string().regex(/^\d+$/) })),
    async (c) => {
      const guildId = c.get("guildId");
      const { discordId } = c.req.valid("param");

      const connection = await db.query.connections.findFirst({
        where: and(eq(connections.guildId, guildId), eq(connections.discordId, discordId)),
        columns: { steamId: true },
      });

      if (!connection) {
        return c.json({ error: "Connection not found." }, 404);
      }

      return c.json({ steamId: connection.steamId }, 200);
    },
  )
  .get(
    "/steam/:steamId",
    describeRoute({
      tags: ["Connections", "Public"],
      summary: "Get Discord connection by Steam ID",
      description: "Retrieve the linked Discord ID for a given Steam user.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    validator("param", z.object({ steamId: z.string().regex(/^\d+$/) })),
    async (c) => {
      const guildId = c.get("guildId");
      const { steamId } = c.req.valid("param");

      const connection = await db.query.connections.findFirst({
        where: and(eq(connections.guildId, guildId), eq(connections.steamId, steamId)),
        columns: { discordId: true },
      });

      if (!connection) {
        return c.json({ error: "Connection not found." }, 404);
      }

      return c.json({ discordId: connection.discordId }, 200);
    },
  )
  .delete(
    "/discord/:discordId",
    describeRoute({
      tags: ["Connections"],
      summary: "Delete connection by Discord ID",
      description: "Delete a connection using the Discord user ID.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("param", z.object({ discordId: z.string().regex(/^\d+$/) })),
    async (c) => {
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
    },
  )
  .delete(
    "/steam/:steamId",
    describeRoute({
      tags: ["Connections"],
      summary: "Delete connection by Steam ID",
      description: "Delete a connection using the Steam user ID.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("param", z.object({ steamId: z.string().regex(/^\d+$/) })),
    async (c) => {
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
    },
  );
