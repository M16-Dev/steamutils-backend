import { Hono } from "@hono/hono";

import steamRoutes from "./steam/steam.routes.ts";

const authRoutes = new Hono()
  .route("/steam", steamRoutes);

export default authRoutes;
