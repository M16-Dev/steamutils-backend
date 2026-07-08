import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema/index.ts";
import { ensureDirSync } from "@std/fs";
import config from "@/config.ts";

const dbPath = config.dbUrl;

if (dbPath.startsWith("file:")) {
  const pathWithoutProtocol = dbPath.replace("file:", "");
  const lastSlashIndex = pathWithoutProtocol.lastIndexOf("/");
  if (lastSlashIndex !== -1) {
    const dir = pathWithoutProtocol.substring(0, lastSlashIndex);
    if (dir && dir !== "." && dir !== "..") {
      ensureDirSync(dir);
    }
  }
}

const client = createClient({
  url: dbPath,
  authToken: config.dbToken,
});

export const db = drizzle(client, { schema });
