import { Hono } from "@hono/hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "@zod/zod";
import { db } from "@/db/index.ts";
import { serverCodes } from "@/db/schema/index.ts";
import { eq } from "drizzle-orm";

const CodeParamSchema = z.object({
  code: z.string().toUpperCase().regex(/^[A-Z]{8}$/),
});

export default new Hono()
  .get("/:code", zValidator("param", CodeParamSchema), async (c) => {
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

      return c.json(server, 200);
    },
    );
