import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const connections = sqliteTable("connections", {
  discordId: text("discord_id").notNull(),
  steamId: text("steam_id").notNull(),
  guildId: text("guild_id").notNull(),
  fetched: integer("fetched", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
}, (table) => [
  primaryKey({ columns: [table.discordId, table.guildId] }),
  uniqueIndex("idx_connections_steam_guild").on(table.steamId, table.guildId),
  index("idx_connections_guild_created_at").on(table.guildId, table.createdAt),
]);
