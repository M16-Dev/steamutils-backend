import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { serverCodes } from "@/db/schema/index.ts";
import { eq } from "drizzle-orm";
import { renderHtmlPage } from "@/utils/templates.ts";

const CodeParamSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

export default new Hono().get("/:code", zValidator("param", CodeParamSchema), async (c) => {
  const { code } = c.req.valid("param");

  const server = await db.query.serverCodes.findFirst({
    where: eq(serverCodes.code, code),
    columns: {
      ip: true,
      port: true,
      password: true,
    },
  });

  if (!server) {
    return c.html(renderHtmlPage("Error", "Server not found", true), 404);
  }

  const steamUrl = `steam://connect/${server.ip}:${server.port}/${server.password ?? ""}`;
  return c.html(
    renderHtmlPage(
      "Connecting...",
      `You are being redirected to the game server.<br><br><a href="${steamUrl}" style="color: #22c55e; text-decoration: underline;">Click here if nothing happens</a>`,
      false,
      steamUrl,
    ),
  );
});
