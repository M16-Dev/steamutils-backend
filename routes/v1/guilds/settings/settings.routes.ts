import { Hono } from "@hono/hono";
import type { GuildEnv } from "@/types/hono.ts";
import { db } from "@/db/index.ts";
import { guildSettings, guildSettingsSchema } from "@/db/schema/index.ts";
import { eq } from "drizzle-orm";
import { describeRoute, validator } from "hono-openapi";
import { requireRole } from "@/middlewares/rbac.ts";

const settingsRoutes = new Hono<GuildEnv>()
  .get(
    "/",
    describeRoute({
      tags: ["Settings", "Public"],
      summary: "Get guild settings",
      description: "Retrieve settings for the current guild.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    async (c) => {
      const guildId = c.get("guildId");

      const settings = (await db.query.guildSettings.findFirst({
        where: eq(guildSettings.guildId, guildId),
      }))?.settings ?? {};

      return c.json(settings);
    },
  )
  .patch(
    "/",
    describeRoute({
      tags: ["Settings"],
      summary: "Update guild settings",
      description: "Partially update settings for the current guild.",
      responses: {
        200: { description: "Successfully updated" },
      },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("json", guildSettingsSchema),
    async (c) => {
      const newSettingsPatch = c.req.valid("json");
      const guildId = c.get("guildId");

      const currentSettings = (await db.query.guildSettings.findFirst({
        where: eq(guildSettings.guildId, guildId),
      }))?.settings ?? {};

      const mergedSettings = {
        ...currentSettings,
        ...newSettingsPatch,
      };

      await db.insert(guildSettings).values({
        guildId,
        settings: mergedSettings,
      }).onConflictDoUpdate({
        target: guildSettings.guildId,
        set: { settings: mergedSettings },
      });

      return c.json(mergedSettings);
    },
  );

export default settingsRoutes;
