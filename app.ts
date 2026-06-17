import { Hono } from "@hono/hono";
import { logger } from "@hono/hono/logger";
import { HTTPException } from "@hono/hono/http-exception";

import apiRouter from "@/routes/api/v1/index.ts";
import connectRouter from "@/routes/connect.ts";
import connectionsRouter from "@/routes/connections.ts";

const app = new Hono();

app.use(logger());

const routes = app
  .route("/api/v1", apiRouter)
  .route("/connect", connectRouter)
  .route("/connections", connectionsRouter);

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  console.error("Internal Server Error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
export type AppType = typeof routes;
