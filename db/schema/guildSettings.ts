import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "@zod/zod";

export const guildSettingsSchema = z.object({
  verifiedRoleId: z.string().regex(/^\d+$/).optional().nullable(),
});

export type IGuildSettings = z.infer<typeof guildSettingsSchema>;

export const guildSettings = sqliteTable("guild_settings", {
  guildId: text("guild_id").notNull(),
  settings: text("settings", { mode: "json" }).$type<IGuildSettings>().notNull().default({}),
}, (table) => [
  primaryKey({ columns: [table.guildId] }),
]);
