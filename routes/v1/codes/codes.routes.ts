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

export default new Hono()
  .get("/:code", zValidator("param", CodeParamSchema), async (c) => {
    const { code } = c.req.valid("param");

    const result = await db.select({
      ip: serverCodes.ip,
      port: serverCodes.port,
      password: serverCodes.password,
    })
      .from(serverCodes)
      .where(eq(serverCodes.code, code))
      .limit(1);

    const server = result[0];

    if (!server) {
      return c.json({ error: "Code not found" }, 404);
    }

    // return c.json(server, 200);

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
