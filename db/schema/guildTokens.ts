import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const guildTokens = sqliteTable("guild_tokens", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  last4: text("last4").notNull(),
  guildId: text("guild_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  createdBy: text("created_by").notNull(),
}, (table) => [
  index("idx_guild_tokens_guild").on(table.guildId),
  uniqueIndex("idx_guild_tokens_token_hash").on(table.tokenHash),
]);
