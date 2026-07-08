import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { HTTPException } from "@hono/hono/http-exception";
import { secureHeaders } from "@hono/hono/secure-headers";
// import { cors } from "@hono/hono/cors";
import { sendMessage } from "@/utils/discordLogger.ts";

import v1Routes from "@/routes/v1/v1.routes.ts";
import connectRoutes from "@/routes/connect/connect.routes.ts";

const app = new Hono();

app.use(secureHeaders());
app.use(logger());

const routes = app
  .route("/v1", v1Routes)
  .route("/connect", connectRoutes);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error("Internal Server Error:", err);
  sendMessage("error", "Internal Server Error", `${err.stack ?? err.message}`);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
