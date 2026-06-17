import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/service.ts";
import { renderHtmlPage } from "@/utils/templates.ts";

const CodeParamSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

export default new Hono()
  .get("/:code", zValidator("param", CodeParamSchema), (c) => {
    const { code } = c.req.valid("param");

    const server = db.serverCodes.getServerByCode(code);
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
