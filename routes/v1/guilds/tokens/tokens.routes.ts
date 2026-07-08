import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { guildTokens } from "@/db/schema/index.ts";
import { and, count, eq } from "drizzle-orm";
import config from "@/config.ts";
import { GuildEnv } from "@/types/hono.ts";
import { paginate, paginationMiddleware } from "@/middlewares/pagination.ts";
import { requireRole } from "@/middlewares/rbac.ts";

import { hashToken } from "@/utils/crypto.ts";

const CreateTokenSchema = z.object({ discordUserId: z.string().regex(/^\d+$/) });
const DeleteTokenSchema = z.object({ id: z.uuid() });

const tokensRouter = new Hono<GuildEnv>()
  .post(
    "/",
    describeRoute({
      tags: ["Tokens"],
      summary: "Create bot token",
      description: "Create a new bot token for the guild.",
      responses: { 201: { description: "Successfully created" }, 403: { description: "Token limit reached" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("json", CreateTokenSchema),
    async (c) => {
      const guildId = c.get("guildId");
      const { discordUserId } = c.req.valid("json");

      const countResult = await db.select({ value: count() }).from(guildTokens).where(eq(guildTokens.guildId, guildId));
      const tokensCount = countResult[0].value;

      if (tokensCount >= config.maxTokensPerGuild) {
        return c.json(
          {
            success: false,
            message: `Token limit reached (${config.maxTokensPerGuild}). Delete an existing token to create a new one.`,
          },
          403,
        );
      }

      const id = crypto.randomUUID();
      const token = crypto.randomUUID().replace(/-/g, "");
      const tokenHash = await hashToken(token);
      const last4 = token.slice(-4);

      await db.insert(guildTokens).values({
        id,
        tokenHash,
        last4,
        guildId,
        createdBy: discordUserId,
      });

      return c.json({ token, id });
    },
  )
  .get(
    "/",
    describeRoute({
      tags: ["Tokens"],
      summary: "Get bot tokens",
      description: "Retrieve a paginated list of bot tokens for the guild.",
      responses: { 200: { description: "Successful response" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    ...paginationMiddleware,
    async (c) => {
      const guildId = c.get("guildId");
      const { limit, offset } = c.get("pagination")!;

      const countResult = await db.select({ value: count() }).from(guildTokens).where(eq(guildTokens.guildId, guildId));
      const total = countResult[0].value;

      const result = await db.select({
        id: guildTokens.id,
        last4: guildTokens.last4,
        createdAt: guildTokens.createdAt,
        createdBy: guildTokens.createdBy,
      }).from(guildTokens)
        .where(eq(guildTokens.guildId, guildId))
        .limit(limit)
        .offset(offset);

      return c.json(paginate(result, total));
    },
  )
  .delete(
    "/:id",
    describeRoute({
      tags: ["Tokens"],
      summary: "Delete bot token",
      description: "Delete a specific bot token.",
      responses: { 204: { description: "Successfully deleted" }, 404: { description: "Not found" } },
      security: [{ BotAuth: [] }],
    }),
    requireRole(["bot"]),
    validator("param", DeleteTokenSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const guildId = c.get("guildId");

      const result = await db.delete(guildTokens).where(
        and(
          eq(guildTokens.id, id),
          eq(guildTokens.guildId, guildId),
        ),
      );

      if (result.rowsAffected === 0) {
        return c.json({ success: false, message: "Token not found" }, 404);
      }
      return c.body(null, 204);
    },
  );

export default tokensRouter;
