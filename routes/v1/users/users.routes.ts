import { Hono } from "@hono/hono";
import { validator } from "hono-openapi";
import { z } from "@zod/zod";
import { createMiddleware } from "@hono/hono/factory";
import type { UserEnv } from "@/types/hono.ts";

import connectionsRoutes from "./connections/connections.routes.ts";

const userIdParamSchema = z.object({
  discordUserId: z.string().regex(/^\d+$/),
});

const setDiscordId = createMiddleware<UserEnv>(async (c, next) => {
  // @ts-ignore: we use validator before using this middleware
  const discordId = c.req.valid("param").discordUserId;

  c.set("userId", discordId);

  return await next();
});

const checkPermission = createMiddleware<UserEnv>(async (c, next) => {
  if (c.get("userRole") === "bot") {
    return await next();
  }

  return c.json({ error: "Unauthorized" }, 401);
});

const userIdRoutes = new Hono()
  .use(validator("param", userIdParamSchema))
  .use(setDiscordId)
  .use(checkPermission)
  .route("/connections", connectionsRoutes);

const usersRoutes = new Hono()
  .route("/:discordUserId", userIdRoutes);

export default usersRoutes;
