import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const serverCodes = sqliteTable("server_codes", {
  code: text("code").primaryKey(),
  guildId: text("guild_id").notNull(),
  ip: text("ip").notNull(),
  port: integer("port").notNull(),
  password: text("password"),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
}, (table) => [
  uniqueIndex("idx_server_codes_guild_ip_port").on(table.guildId, table.ip, table.port),
]);
