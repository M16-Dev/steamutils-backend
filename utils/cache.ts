const CACHE_BASE_URL = "https://steamutils.internal/cache/";

/**
 * Checks if the cache entry is still fresh (not expired).
 * Manually verifies because Deno and DenoDeploy does not auto-evict based on Cache-Control.
 */
function isFresh(response: Response): boolean {
  const dateHeader = response.headers.get("Date");
  const cacheControl = response.headers.get("Cache-Control");

  if (!dateHeader || !cacheControl) return false;

  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  if (!maxAgeMatch) return false;

  const maxAge = parseInt(maxAgeMatch[1], 10);
  const cacheDate = new Date(dateHeader).getTime();

  return Date.now() <= cacheDate + maxAge * 1000;
}

/**
 * Gets a cached value from the Web Cache API.
 * @param cacheName The name of the cache to use.
 * @param key The key to use for caching.
 */
export async function getCache<T>(cacheName: string, key: string): Promise<T | null>;
/**
 * Gets a cached HTTP Response from the Web Cache API.
 * @param cacheName The name of the cache to use.
 * @param request The request to use for caching.
 */
export async function getCache(cacheName: string, request: Request): Promise<Response | null>;
export async function getCache<T>(
  cacheName: string,
  keyOrRequest: string | Request,
): Promise<T | Response | null> {
  if (typeof keyOrRequest === "string") {
    const request = new Request(CACHE_BASE_URL + keyOrRequest);
    const response = await getCache(cacheName, request);
    if (!response) return null;
    return (await response.json()) as T;
  }

  const request = keyOrRequest;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (!cached) return null;

  if (!isFresh(cached)) {
    await cache.delete(request);
    return null;
  }

  return cached;
}

/**
 * Sets a cached value in the Web Cache API.
 * @param cacheName The name of the cache to use.
 * @param key The key to use for caching.
 * @param value The value to cache.
 * @param ttlSeconds The time-to-live in seconds.
 */
export async function setCache(cacheName: string, key: string, value: unknown, ttlSeconds?: number): Promise<void>;
/**
 * Sets a cached HTTP Response in the Web Cache API.
 * @param cacheName The name of the cache to use.
 * @param request The request to use for caching.
 * @param response The response to cache.
 * @param ttlSeconds The time-to-live in seconds.
 */
export async function setCache(cacheName: string, request: Request, response: Response, ttlSeconds?: number): Promise<void>;
export async function setCache(
  cacheName: string,
  keyOrRequest: string | Request,
  valueOrResponse: unknown,
  ttlSeconds = 300,
): Promise<void> {
  if (typeof keyOrRequest === "string") {
    const request = new Request(CACHE_BASE_URL + keyOrRequest);
    const response = new Response(JSON.stringify(valueOrResponse), {
      headers: { "Content-Type": "application/json" },
    });
    await setCache(cacheName, request, response, ttlSeconds);
    return;
  }

  const request = keyOrRequest;
  const response = valueOrResponse as Response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `max-age=${ttlSeconds}`);
  headers.set("Date", new Date().toUTCString());

  const responseToStore = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });

  const cache = await caches.open(cacheName);
  await cache.put(request, responseToStore);
}
