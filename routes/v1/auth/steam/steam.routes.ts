import { Hono } from "@hono/hono";

import linkRoutes from "./link/link.routes.ts";

const steamRoutes = new Hono()
  .route("/link", linkRoutes);

export default steamRoutes;
