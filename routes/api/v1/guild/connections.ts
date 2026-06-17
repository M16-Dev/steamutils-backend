import { Hono } from "@hono/hono";
import { db } from "@/db/service.ts";
import { z } from "@zod/zod";
import { zValidator } from "@hono/zod-validator";

const QuerySchema = z.object({
  new: z.coerce.boolean().optional().default(false),
});

export default new Hono<{ Variables: { guildId: string } }>()
  .get("/", zValidator("query", QuerySchema), (c) => {
    const guildId = c.get("guildId");
    const query = c.req.valid("query");

    const rows = query.new ? db.connections.getNew(guildId) : db.connections.getAll(guildId);

    const response = rows.map((row) => ({
      discordId: row.discord_id,
      steamId: row.steam_id,
      createdAt: row.created_at,
      ...(!query.new && { fetched: !!row.fetched }),
    }));

    return c.json(response);
  });
