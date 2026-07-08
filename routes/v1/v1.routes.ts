import { Hono } from "@hono/hono";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { authMiddleware } from "@/middlewares/auth.ts";
import { denyByDefault } from "@/middlewares/rbac.ts";

import guildsRoutes from "./guilds/guilds.routes.ts";
import usersRoutes from "./users/users.routes.ts";
import codesRoutes from "./codes/codes.routes.ts";
import authRoutes from "./auth/auth.routes.ts";

const v1Routes = new Hono();

const routes = v1Routes
  // Create Swagger documentation for the API
  .get(
    "/openapi.json",
    openAPIRouteHandler(v1Routes, {
      documentation: {
        info: { title: "SteamUtils Developer API", version: "1.0.0" },
      },
    }),
  )
  .get("/docs", swaggerUI({ url: "/openapi.json" }))
  // routes
  .route("/auth", authRoutes)
  .route("/codes", codesRoutes)
  // restricted routes
  .use(authMiddleware)
  .use(denyByDefault)
  .route("/guilds", guildsRoutes)
  .route("/users", usersRoutes);

export default routes;
