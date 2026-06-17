import { Hono } from "@hono/hono";
import { bearerAuth } from "@hono/hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/service.ts";
import config from "@/config.ts";

const tokensRouter = new Hono()
  .use(bearerAuth({ token: config.apiKey }))
  .post("/", zValidator("json", z.object({ guildId: z.string() })), (c) => {
    const { guildId } = c.req.valid("json");

    const count = db.guildTokens.countByGuild(guildId);
    if (count >= config.maxTokensPerGuild) {
      return c.json(
        {
          success: false,
          message: `Token limit reached (${config.maxTokensPerGuild}). Delete an existing token to create a new one.`,
        },
        403,
      );
    }

    const token = db.guildTokens.create(guildId);
    return c.json({ token, guildId });
  })
  .get("/:guildId", (c) => {
    const guildId = c.req.param("guildId");
    const tokens = db.guildTokens.getByGuild(guildId);
    return c.json(tokens);
  })
  .delete("/:token", (c) => {
    const token = c.req.param("token");
    const success = db.guildTokens.delete(token);
    if (!success) {
      return c.json({ success: false, message: "Token not found" }, 404);
    }
    return c.json({ success: true });
  });

export default tokensRouter;
