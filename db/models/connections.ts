import { Database } from "@db/sqlite";
import { Connection } from "../types.ts";

export class ConnectionsModel {
  constructor(private db: Database) {
    this.db.exec(`CREATE TABLE IF NOT EXISTS connections (
      discord_id TEXT NOT NULL,
      steam_id TEXT NOT NULL,
      guild_id TEXT NOT NULL,
      fetched BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (discord_id, guild_id)
    )`);

    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_steam_guild 
      ON connections(steam_id, guild_id)
    `);

    // migration
    try {
      this.db.exec("ALTER TABLE connections ADD COLUMN fetched BOOLEAN DEFAULT 0");
    } catch { /* Column exists */ }
  }

  create(discordId: string, steamId: string, guildId: string): boolean {
    const stmt = this.db.prepare(
      "INSERT OR IGNORE INTO connections (discord_id, steam_id, guild_id) VALUES (?, ?, ?)",
    );
    const changes = stmt.run(discordId, steamId, guildId);
    return changes > 0;
  }

  getAll(guildId: string): (Connection)[] {
    const stmt = this.db.prepare(
      "SELECT * FROM connections WHERE guild_id = ?",
    );
    return stmt.all<Connection>(guildId);
  }

  getNew(guildId: string): (Connection)[] {
    const stmt = this.db.prepare(
      "UPDATE connections SET fetched = 1 WHERE guild_id = ? AND fetched = 0 RETURNING *",
    );
    return stmt.all<Connection>(guildId);
  }

  delete(discordId: string, guildId: string): boolean {
    const stmt = this.db.prepare(
      "DELETE FROM connections WHERE discord_id = ? AND guild_id = ?",
    );
    const changes = stmt.run(discordId, guildId);
    return changes > 0;
  }

  deleteBySteamId(steamId: string): boolean {
    const stmt = this.db.prepare(
      "DELETE FROM connections WHERE steam_id = ?",
    );
    const changes = stmt.run(steamId);
    return changes > 0;
  }

  deleteByDiscordId(discordId: string): boolean {
    const stmt = this.db.prepare(
      "DELETE FROM connections WHERE discord_id = ?",
    );
    const changes = stmt.run(discordId);
    return changes > 0;
  }

  deleteByGuildId(guildId: string): boolean {
    const stmt = this.db.prepare(
      "DELETE FROM connections WHERE guild_id = ?",
    );
    const changes = stmt.run(guildId);
    return changes > 0;
  }

  getAllByDiscordId(discordId: string): (Connection)[] {
    const stmt = this.db.prepare(
      "SELECT discord_id, steam_id, guild_id, created_at FROM connections WHERE discord_id = ?",
    );
    return stmt.all<Connection>(discordId);
  }

  getAllBySteamId(steamId: string): (Connection)[] {
    const stmt = this.db.prepare(
      "SELECT discord_id, steam_id, guild_id, created_at FROM connections WHERE steam_id = ?",
    );
    return stmt.all<Connection>(steamId);
  }

  getDiscordId(steamId: string, guildId: string): string | null {
    const stmt = this.db.prepare(
      "SELECT discord_id FROM connections WHERE steam_id = ? AND guild_id = ?",
    );
    const res = stmt.value<[string]>(steamId, guildId);
    return res?.[0] ?? null;
  }

  getSteamId(discordId: string, guildId: string): string | null {
    const stmt = this.db.prepare(
      "SELECT steam_id FROM connections WHERE discord_id = ? AND guild_id = ?",
    );
    const res = stmt.value<[string]>(discordId, guildId);
    return res?.[0] ?? null;
  }
}
