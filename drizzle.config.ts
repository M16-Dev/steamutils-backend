import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: Deno.env.get("DB_URL") ?? "file:./data/steamutils.db",
    ...(Deno.env.get("DB_TOKEN") && { authToken: Deno.env.get("DB_TOKEN") }),
  },
});
