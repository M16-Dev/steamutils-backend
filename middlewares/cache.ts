import { createMiddleware } from "@hono/hono/factory";
import { getCache, setCache } from "@/utils/cache.ts";

interface CacheMiddlewareOptions {
  cacheName: string;
  maxAge: number;
}

/**
 * HTTP Caching Middleware
 * Caches HTTP responses for a specified time.
 * Uses CacheStorage API with manual TTL verification because Deno and DenoDeploy does not auto-evict based on Cache-Control.
 */
export const cache = (options: CacheMiddlewareOptions) => {
  return createMiddleware(async (c, next) => {
    const request = new Request(c.req.url);

    const cachedResponse = await getCache(options.cacheName, request);
    if (cachedResponse) {
      c.res = cachedResponse;
      return;
    }

    await next();

    if (c.res.status === 200) {
      await setCache(options.cacheName, request, c.res.clone(), options.maxAge);
    }
  });
};
