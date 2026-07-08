import { Hono } from "@hono/hono";
import { describeRoute, validator } from "hono-openapi";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { serverCodes } from "@/db/schema/index.ts";
import { eq } from "drizzle-orm";
import { decryptPassword } from "@/utils/crypto.ts";
import { config } from "@/config.ts";

const CodeParamSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

export default new Hono()
  .get(
    "/:code",
    describeRoute({
      tags: ["Public", "Codes"],
      summary: "Get server details by code",
      description: "Retrieve server connection details for a specific connect code.",
      responses: {
        200: { description: "Successful response" },
      },
    }),
    validator("param", CodeParamSchema),
    async (c) => {
      const { code } = c.req.valid("param");

      const server = await db.query.serverCodes.findFirst({
        where: eq(serverCodes.code, code),
        columns: {
          ip: true,
          port: true,
          password: true,
        },
      });

      if (!server) {
        return c.json({ error: "Code not found" }, 404);
      }

      if (server.password) {
        server.password = await decryptPassword(server.password, config.encryptionKey);
      }

      return c.json(server, 200);
    },
  );
