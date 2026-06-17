import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { verify } from "@wok/djwt";
import { config } from "@/config.ts";
import { db } from "@/db/service.ts";
import { SteamAuth } from "@/utils/steamAuth.ts";
import { renderHtmlPage } from "@/utils/templates.ts";

const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(config.jwtSecret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["verify"],
);

const steamAuth = new SteamAuth(
  `${config.appUrl}/connections/create/callback`,
  config.appUrl,
);

const SteamAuthParamsSchema = z.object({
  token: z.string(),
});

export default new Hono()
  .get("/create", zValidator("query", SteamAuthParamsSchema), (c) => {
    const { token } = c.req.valid("query");
    const redirectUrl = steamAuth.getRedirectUrl({ token });
    return c.redirect(redirectUrl);
  })
  .get("/create/callback", async (c) => {
    const url = new URL(c.req.url);

    let steamId: string | null;
    try {
      steamId = await steamAuth.verify(url);
    } catch (err) {
      console.error("Steam verification error:", err);
      return c.html(renderHtmlPage("Error", "Failed to verify Steam account", true), 502);
    }

    if (!steamId) {
      return c.html(renderHtmlPage("Error", "Authentication failed", true), 401);
    }

    const { token } = steamAuth.getState(url);
    if (!token) {
      return c.html(renderHtmlPage("Error", "Missing return token", true), 400);
    }

    let payload;
    try {
      payload = await verify(token, jwtKey);
    } catch (_) {
      return c.html(renderHtmlPage("Error", "Token expired or invalid", true), 401);
    }

    const TokenPayloadSchema = z.object({
      discordId: z.string(),
      guildId: z.string(),
    });
    const parsed = TokenPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return c.html(renderHtmlPage("Error", "Invalid token payload", true), 400);
    }

    const { discordId, guildId } = parsed.data;

    try {
      const success = db.connections.create(discordId, steamId, guildId);
      if (!success) {
        return c.html(renderHtmlPage("Error", "Accounts already linked.", true), 409);
      }
    } catch (err) {
      console.error("Database error:", err);
      return c.html(renderHtmlPage("Error", "Internal Database Error", true), 500);
    }

    fetch(`${config.botApiUrl}/api/internal/user-verified`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.botApiKey}`,
      },
      body: JSON.stringify({ guildId, discordId }),
    }).catch((err) => console.error("Failed to notify bot:", err));

    return c.html(
      renderHtmlPage(
        "Connected!",
        "Your Steam account has been successfully linked with Discord.",
      ),
    );
  });
