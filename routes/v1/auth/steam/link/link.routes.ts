import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "@zod/zod";
import { verify } from "@wok/djwt";
import { config } from "@/config.ts";
import { db } from "@/db/index.ts";
import { connections } from "@/db/schema/index.ts";
import { SteamAuth } from "@/utils/steamAuth.ts";
import { renderHtmlPage } from "@/utils/templates.ts";
import { sendMessage } from "@/utils/discordLogger.ts";
import { fetchWithRetry } from "@/utils/fetch.ts";

const usedJtis = new Set<string>();

const jwtKey = await crypto.subtle.importKey(
  "raw",
  new TextEncoder().encode(config.jwtSecret),
  { name: "HMAC", hash: "SHA-256" },
  false,
  ["verify"],
);

const steamAuth = new SteamAuth(
  `${config.apiUrl}/v1/auth/steam/link/callback`,
  config.apiUrl,
);

const SteamAuthParamSchema = z.object({
  token: z.string(),
});

export default new Hono()
  .get(
    "/",
    describeRoute({
      tags: ["Auth"],
      summary: "Start Steam Link",
      description: "Initiates the Steam OpenID login process.",
      responses: { 302: { description: "Redirect to Steam" } },
    }),
    validator("query", SteamAuthParamSchema),
    (c) => {
      const { token } = c.req.valid("query");
      const redirectUrl = steamAuth.getRedirectUrl({ token });
      return c.redirect(redirectUrl);
    },
  )
  .get(
    "/callback",
    describeRoute({
      tags: ["Auth"],
      summary: "Steam Link Callback",
      description: "Handles the callback from Steam OpenID.",
      responses: { 200: { description: "Successfully linked" }, 401: { description: "Unauthorized" } },
    }),
    async (c) => {
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
        jti: z.uuid(),
        discordId: z.string(),
        guildId: z.string(),
        exp: z.number(),
      });
      const parsed = TokenPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return c.html(renderHtmlPage("Error", "Invalid token payload", true), 400);
      }

      const { discordId, guildId, jti, exp } = parsed.data;

      if (usedJtis.has(jti)) {
        return c.html(renderHtmlPage("Error", "Token has already been used.", true), 401);
      }

      usedJtis.add(jti);
      setTimeout(() => usedJtis.delete(jti), (exp * 1000) - Date.now());

      try {
        const result = await db.insert(connections).values({
          discordId,
          steamId,
          guildId,
        }).onConflictDoNothing();

        if (result.rowsAffected === 0) {
          return c.html(renderHtmlPage("Error", "Accounts already linked.", true), 409);
        }
      } catch (err) {
        console.error("Database error:", err);
        return c.html(renderHtmlPage("Error", "Internal Database Error", true), 500);
      }

      fetchWithRetry(`${config.botApiUrl}/api/internal/user-verified`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${config.botApiAccessToken}`,
        },
        body: JSON.stringify({ guildId, discordId }),
      }).catch((err) => {
        console.error("Failed to notify bot after multiple retries:", err);
        sendMessage(
          "error",
          "Failed to notify bot about new connection",
          `Guild ID: ${guildId}\nDiscord ID: ${discordId}\nSteam ID: ${steamId}\nError: ${err.stack ?? err.message}`,
        );
      });

      return c.html(
        renderHtmlPage(
          "Connected!",
          "Your Steam account has been successfully linked with Discord.",
        ),
      );
    },
  );
