import { Hono } from "@hono/hono";
import { bearerAuth } from "@hono/hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/service.ts";
import { config } from "@/config.ts";

const GetConnectionsSchema = z.object({
  discordId: z.string().regex(/^\d+$/).optional(),
  steamId: z.string().regex(/^\d+$/).optional(),
  guildId: z.string().regex(/^\d+$/).optional(),
}).refine((data) => (!!data.discordId !== !!data.steamId), {
  message: "Provide strictly one: discordId OR steamId",
});

const DeleteConnectionsSchema = z.object({
  discordId: z.string().regex(/^\d+$/),
  guildId: z.string().regex(/^\d+$/),
});

export default new Hono()
  .use(bearerAuth({ token: config.apiKey }))
  .get("/", zValidator("query", GetConnectionsSchema), (c) => {
    const { discordId, steamId, guildId } = c.req.valid("query");

    if (discordId) {
      if (guildId) {
        const s = db.connections.getSteamId(discordId, guildId);
        return c.json({ steamId: s }, 200);
      }
      const connections = db.connections.getAllByDiscordId(discordId);
      return c.json({ connections }, 200);
    }

    if (guildId) {
      const d = db.connections.getDiscordId(steamId!, guildId);
      return c.json({ discordId: d }, 200);
    }

    const connections = db.connections.getAllBySteamId(steamId!);
    return c.json({ connections }, 200);
  })
  .delete("/", zValidator("json", DeleteConnectionsSchema), (c) => {
    const { discordId, guildId } = c.req.valid("json");
    const success = db.connections.delete(discordId, guildId);

    if (!success) {
      return c.json({ error: "Connection not found." }, 404);
    }

    return c.body(null, 204);
  });
