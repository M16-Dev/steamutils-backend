import { Hono } from "@hono/hono";
import { generateSpecs } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { authMiddleware } from "@/middlewares/auth.ts";
import { denyByDefault } from "@/middlewares/rbac.ts";
import { filterPublicPaths, stripPublicTag } from "@/utils/openapi.ts";
import { config } from "@/config.ts";

import guildsRoutes from "./guilds/guilds.routes.ts";
import usersRoutes from "./users/users.routes.ts";
import codesRoutes from "./codes/codes.routes.ts";
import authRoutes from "./auth/auth.routes.ts";

const docs = {
  info: { title: "SteamUtils Internal API", version: "1.0.0" },
  servers: [{ url: "/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "Developer API Key",
      },
      BotAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "Bot <token>",
        description: "Bot Access Token",
      },
    },
  },
};

const publicDocs = {
  info: { title: "SteamUtils Public API", version: "1.0.0" },
  servers: [{ url: "/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        description: "Developer API Key",
      },
    },
  },
};

const v1Routes = new Hono();

// -- Create Swagger docs
v1Routes.get("/openapi.json", async (c) => {
  const spec = await generateSpecs(v1Routes, { documentation: publicDocs });
  return c.json(filterPublicPaths(spec));
});
v1Routes.get("/docs", swaggerUI({ url: "/v1/openapi.json" }));

if (config.env === "development") {
  v1Routes.get("/internal/openapi.json", async (c) => {
    const spec = await generateSpecs(v1Routes, { documentation: docs });
    return c.json(stripPublicTag(spec));
  });
  v1Routes.get("/docs/internal", swaggerUI({ url: "/v1/internal/openapi.json" }));
}

const routes = v1Routes
  // -- Routes
  .route("/auth", authRoutes)
  .route("/codes", codesRoutes)
  // -- Authentication middlewares
  .use(authMiddleware)
  .use(denyByDefault)
  // -- Restricted Routes
  .route("/guilds", guildsRoutes)
  .route("/users", usersRoutes);

export default routes;
