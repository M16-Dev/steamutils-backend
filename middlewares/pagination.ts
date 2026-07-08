import { createFactory } from "@hono/hono/factory";
import { validator } from "hono-openapi";
import { z } from "@zod/zod";
import type { IdentityEnv } from "@/types/hono.ts";

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

const paginationSchema = z.object({
  page: z.coerce.number().min(1).catch(1).default(1),
  limit: z.coerce.number().min(1).max(100).catch(100).default(100),
});

const factory = createFactory<IdentityEnv>();

/**
 * Pagination middleware for Hono.
 * It adds query params for pagination and extends response with meta data.
 * Sets pagination object in context ({ page, limit, offset })
 */
export const paginationMiddleware = factory.createHandlers(
  validator("query", paginationSchema),
  async (c, next) => {
    const { page, limit } = c.req.valid("query");

    const offset = (page - 1) * limit;
    c.set("pagination", { page, limit, offset });

    await next();

    const total = c.get("paginationTotal");
    if (total !== undefined && c.res.ok) {
      const data = await c.res.json();
      const totalPages = Math.ceil(total / limit);

      const meta: PaginationMeta = {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };

      c.res = c.json({ data, meta });
    }
  },
);
