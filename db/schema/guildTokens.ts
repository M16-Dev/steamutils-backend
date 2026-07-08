import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const guildTokens = sqliteTable("guild_tokens", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  last4: text("last4").notNull(),
  guildId: text("guild_id").notNull(),
  createdAt: text("created_at").default("CURRENT_TIMESTAMP"),
  createdBy: text("created_by").notNull(),
}, (table) => [
  index("idx_guild_tokens_guild").on(table.guildId),
]);
