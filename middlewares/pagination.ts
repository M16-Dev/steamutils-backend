import { createFactory } from "@hono/hono/factory";
import { validator } from "hono-openapi";
import { z } from "@zod/zod";
import type { IdentityEnv } from "@/types/hono.ts";
import { getContext } from "@hono/hono/context-storage";

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
 * Validates query params for pagination and sets the pagination env var.
 * Adds pagination object ({ page, limit, offset }) to Context.
 * Remember to return paginate(items, total) from the handler.
 * @example
 * app.get("/", ...paginationMiddleware, (c) => {
 *   const { page, limit, offset } = c.req.valid("query");
 *   const items = await db.query.items.findMany({ limit, offset });
 *   const data = paginate(items, total);
 *   return c.json(data);
 * });
 */
export const paginationMiddleware = factory.createHandlers(
  validator("query", paginationSchema),
  async (c, next) => {
    const { page, limit } = c.req.valid("query");
    const offset = (page - 1) * limit;
    c.set("pagination", { page, limit, offset });
    await next();
  },
);

/**
 * Helper function to wrap your data in a paginated response.
 * Used in conjuction with paginationMiddleware.
 * @example
 * app.get("/", ...paginationMiddleware, (c) => {
 *   const { page, limit, offset } = c.req.valid("query");
 *   const items = await db.query.items.findMany({ limit, offset });
 *   const data = paginate(items, total);
 *   return c.json(data);
 * });
 */
export function paginate<T>(data: T[], total: number): PaginatedResponse<T> {
  const c = getContext<IdentityEnv>();
  const { page, limit } = c.get("pagination")!;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
