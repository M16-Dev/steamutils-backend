import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { serverCodes } from "@/db/schema/index.ts";
import { and, count, eq } from "drizzle-orm";
import { config } from "@/config.ts";
import { GuildEnv } from "@/types/hono.ts";
import { customAlphabet } from "@sitnik/nanoid";
import { paginationMiddleware } from "@/middlewares/pagination.ts";
import { requireRole } from "@/middlewares/rbac.ts";
import { decryptPassword, encryptPassword } from "@/utils/crypto.ts";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 8);

const CreateCodeSchema = z.object({
  ip: z.ipv4(),
  port: z.number().int().positive().max(65535),
  password: z.string().min(1).max(50).optional(),
});

const CodeSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

export default new Hono<GuildEnv>()
  .post(
    "/",
    describeRoute({
      tags: ["Codes"],
      summary: "Create connect code",
      description: "Create a new server connection code.",
      responses: { 201: { description: "Successfully created" }, 402: { description: "Limit reached" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("json", CreateCodeSchema),
    async (c) => {
      const { ip, port, password } = c.req.valid("json");
      const guildId = c.get("guildId");

      const existingCodeObj = await db.query.serverCodes.findFirst({
        where: and(eq(serverCodes.guildId, guildId), eq(serverCodes.ip, ip), eq(serverCodes.port, port)),
        columns: { code: true },
      });

      const encryptedPassword = password ? await encryptPassword(password, config.encryptionKey) : null;

      if (existingCodeObj) {
        const existingCode = existingCodeObj.code;
        await db.update(serverCodes).set({ password: encryptedPassword }).where(eq(serverCodes.code, existingCode));
        return c.json({ code: existingCode }, 200);
      }

      const countResult = await db.select({ value: count() }).from(serverCodes).where(eq(serverCodes.guildId, guildId));
      const codesCount = countResult[0].value;

      if (codesCount >= config.plans.free.maxCodesPerGuild) {
        return c.json({ error: "Free codes limit reached for this guild" }, 402);
      }

      const newCode = nanoid();
      try {
        await db.insert(serverCodes).values({ code: newCode, guildId, ip, port, password: encryptedPassword });
      } catch (_) {
        return c.json({ error: "Failed to generate unique code." }, 500);
      }

      return c.json({ code: newCode }, 201);
    },
  )
  .get(
    "/:code",
    describeRoute({
      tags: ["Codes", "Public"],
      summary: "Get server details by code",
      description: "Retrieve server connection details for a specific connect code.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    validator("param", CodeSchema),
    async (c) => {
      const { code } = c.req.valid("param");
      const guildId = c.get("guildId");

      const serverCodeObj = await db.query.serverCodes.findFirst({
        where: and(eq(serverCodes.code, code), eq(serverCodes.guildId, guildId)),
        columns: {
          code: true,
          ip: true,
          port: true,
          password: true,
        },
      });

      if (!serverCodeObj) {
        return c.json({ error: "Code not found" }, 404);
      }

      if (serverCodeObj.password) {
        serverCodeObj.password = await decryptPassword(serverCodeObj.password, config.encryptionKey);
      }

      return c.json(serverCodeObj, 200);
    },
  )
  .delete(
    "/:code",
    describeRoute({
      tags: ["Codes"],
      summary: "Delete connect code",
      description: "Delete a specific server connection code.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("param", CodeSchema),
    async (c) => {
      const { code } = c.req.valid("param");
      const guildId = c.get("guildId");
      const result = await db.delete(serverCodes).where(and(eq(serverCodes.code, code), eq(serverCodes.guildId, guildId)));

      if (result.rowsAffected === 0) {
        return c.json({ error: "Code not found" }, 404);
      }

      return c.body(null, 204);
    },
  )
  .get(
    "/",
    describeRoute({
      tags: ["Codes", "Public"],
      summary: "Get all server codes",
      description: "Retrieve a paginated list of all server codes for the current guild.",
      responses: {
        200: { description: "Successful response" },
      },
      security: [{ BotAuth: [] }, { BearerAuth: [] }],
    }),
    requireRole(["bot", "developer"]),
    ...paginationMiddleware,
    async (c) => {
      const guildId = c.get("guildId");
      const { limit, offset } = c.get("pagination")!;

      const countResult = await db.select({ value: count() }).from(serverCodes).where(eq(serverCodes.guildId, guildId));
      c.set("paginationTotal", countResult[0].value);

      const codes = await db.select({
        code: serverCodes.code,
        ip: serverCodes.ip,
        port: serverCodes.port,
        password: serverCodes.password,
      }).from(serverCodes)
        .where(eq(serverCodes.guildId, guildId))
        .limit(limit)
        .offset(offset);

      for (const code of codes) {
        if (code.password) {
          code.password = await decryptPassword(code.password, config.encryptionKey);
        }
      }

      return c.json(codes, 200);
    },
  );
