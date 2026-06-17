import { Hono } from "@hono/hono";

import guildRouter from "./guild/index.ts";
import connectionsRouter from "./connections.ts";
import tokensRouter from "./tokens.ts";
import codesRouter from "./codes.ts";

export default new Hono()
  .route("/guild", guildRouter)
  .route("/connections", connectionsRouter)
  .route("/tokens", tokensRouter)
  .route("/codes", codesRouter);
