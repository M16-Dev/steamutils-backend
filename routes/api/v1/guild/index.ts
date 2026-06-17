import { Context, Hono } from "@hono/hono";
import { bearerAuth } from "@hono/hono/bearer-auth";
import { db } from "@/db/service.ts";

import connectionsRouter from "./connections.ts";

export default new Hono<{ Variables: { guildId: string } }>()
  .use(
    "*",
    bearerAuth({
      verifyToken: (token, c: Context<{ Variables: { guildId: string } }>) => {
        const guildId = db.guildTokens.getByToken(token);
        if (guildId) {
          c.set("guildId", guildId);
          return true;
        }
        return false;
      },
    }),
  )
  .route("/connections", connectionsRouter);
