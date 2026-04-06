const requests: number[] = [];
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20; // 20 requests per minute

export function checkRateLimit(): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  // Remove entries outside the window
  while (requests.length > 0 && requests[0] <= now - WINDOW_MS) {
    requests.shift();
  }
  if (requests.length >= MAX_REQUESTS) {
    const retryAfterMs = requests[0] + WINDOW_MS - now;
    return { allowed: false, retryAfterMs };
  }
  requests.push(now);
  return { allowed: true };
}
