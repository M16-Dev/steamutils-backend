/**
 * Fetches a URL with retry logic.
 * @param url - URL to fetch.
 * @param options - Request options.
 * @param maxRetries - Maximum number of retries.
 * @param baseDelayMs - Base delay between retries (exponential backoff).
 * @returns Promise that resolves to the response.
 */
export async function fetchWithRetry(
  url: string | URL | Request,
  options?: RequestInit,
  maxRetries = 3,
  baseDelayMs = 1000,
): Promise<Response> {
  let attempt = 0;
  while (true) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) {
        throw err;
      }
      // exponential backoff: 1s, 2s, 4s...
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`Fetch failed (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
