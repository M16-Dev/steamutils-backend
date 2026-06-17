export interface Server {
  ip: string;
  port: number;
  password?: string | null;
}

export interface ServerCodeRow extends Server {
  code: string;
  guild_id: string;
  created_at: string;
}

export interface Connection {
  discord_id: string;
  steam_id: string;
  guild_id: string;
  fetched: number; // 0 or 1
  created_at: string;
}
