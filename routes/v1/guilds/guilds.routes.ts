import { Hono } from "@hono/hono";
import { createMiddleware } from "@hono/hono/factory";
import { validator } from "hono-openapi";
import { z } from "@zod/zod";
import type { GuildEnv, IdentityEnv } from "@/types/hono.ts";

import codesRoutes from "./codes/codes.routes.ts";
import connectionsRoutes from "./connections/connections.routes.ts";
import settingsRoutes from "./settings/settings.routes.ts";
import tokensRoutes from "./tokens/tokens.routes.ts";

const guildIdParamSchema = z.object({
  guildId: z.union([
    z.literal("@me"),
    z.string().regex(/^\d+$/),
  ]),
});

const setGuildId = createMiddleware<GuildEnv>(async (c, next) => {
  // @ts-ignore: we use validator before using this middleware
  const guildId = c.req.valid("param").guildId;

  if (guildId === "@me") {
    if (!c.get("tokenGuildId")) {
      return c.json({ error: "Bad Request" }, 400);
    }

    c.set("guildId", c.get("tokenGuildId")!);
  } else {
    c.set("guildId", guildId);
  }

  return await next();
});

const checkPermission = createMiddleware<GuildEnv>(async (c, next) => {
  if (c.get("userRole") === "bot") {
    return await next();
  }

  if (!!c.get("tokenGuildId") && c.get("tokenGuildId") === c.get("guildId")) {
    return await next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});

const guildIdRoutes = new Hono<IdentityEnv>()
  .use(validator("param", guildIdParamSchema))
  .use(setGuildId)
  .use(checkPermission)
  .route("/codes", codesRoutes)
  .route("/connections", connectionsRoutes)
  .route("/settings", settingsRoutes)
  .route("/tokens", tokensRoutes);

const guildsRoutes = new Hono()
  .route("/:guildId", guildIdRoutes);

export default guildsRoutes;
