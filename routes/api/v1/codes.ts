import { Hono } from "@hono/hono";
import { bearerAuth } from "@hono/hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/service.ts";
import { config } from "@/config.ts";

const CreateCodeSchema = z.object({
  guildId: z.string().regex(/^[0-9]+$/),
  ip: z.ipv4(),
  port: z.number().int().positive().max(65535),
  password: z.string().min(1).max(50).nullable(),
});

const CodeSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

const GuildIdSchema = z.object({
  guildId: z.string().regex(/^[0-9]+$/),
});

export default new Hono()
  .use(bearerAuth({ token: config.apiKey }))
  .post("/", zValidator("json", CreateCodeSchema), (c) => {
    const { guildId, ip, port, password } = c.req.valid("json");

    if (db.serverCodes.getGuildCodesCount(guildId) >= config.plans.free.maxCodesPerGuild) {
      const existingCode = db.serverCodes.getCodeByServer(guildId, ip, port);

      if (existingCode) {
        db.serverCodes.updatePassword(existingCode, password);
        return c.json({ code: existingCode }, 200);
      }

      return c.json({ error: "Free codes limit reached for this guild" }, 402);
    }

    const code = db.serverCodes.create(guildId, ip, port, password);

    return c.json({ code }, 201);
  })
  .get("/:code", zValidator("param", CodeSchema), (c) => {
    const { code } = c.req.valid("param");
    const server = db.serverCodes.getServerByCode(code);

    if (!server) {
      return c.json({ error: "Code not found" }, 404);
    }

    return c.json({ data: server }, 200);
  })
  .delete("/:code", zValidator("param", CodeSchema), (c) => {
    const { code } = c.req.valid("param");
    const success = db.serverCodes.delete(code);

    if (!success) {
      return c.json({ error: "Code not found" }, 404);
    }

    return c.body(null, 204);
  })
  .get("/guild/:guildId", zValidator("param", GuildIdSchema), (c) => {
    const { guildId } = c.req.valid("param");
    const codes = db.serverCodes.getAllByGuild(guildId);

    return c.json({ data: codes }, 200);
  });
