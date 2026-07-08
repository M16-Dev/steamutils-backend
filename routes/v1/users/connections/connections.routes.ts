import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { connections } from "@/db/schema/index.ts";
import { and, count, eq } from "drizzle-orm";
import { UserEnv } from "@/types/hono.ts";
import { paginationMiddleware } from "@/middlewares/pagination.ts";
import { requireRole } from "@/middlewares/rbac.ts";

export default new Hono<UserEnv>()
  .get(
    "/",
    describeRoute({
      tags: ["User Connections"],
      summary: "Get connections for user",
      description: "Retrieve a paginated list of connections for the Discord user.",
      responses: { 200: { description: "Successful response" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    ...paginationMiddleware,
    async (c) => {
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
    },
  )
  .delete(
    "/guild/:guildId",
    describeRoute({
      tags: ["User Connections"],
      summary: "Delete connection in guild",
      description: "Delete the connection for this user in a specific guild.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("param", z.object({ guildId: z.string().regex(/^\d+$/) })),
    async (c) => {
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
    },
  );
