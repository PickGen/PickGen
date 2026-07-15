import { config } from '../config.js';

/** Sliding-window in-memory rate limiter keyed by user+ip (FR-8.2).
 *  Swap for Redis when running multiple instances (NFR-5). */
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;

export function checkRateLimit(key: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= config.rateLimitPerMin) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - arr[0])) / 1000);
    hits.set(key, arr);
    return { ok: false, retryAfter };
  }
  arr.push(now);
  hits.set(key, arr);
  return { ok: true };
}

// periodic cleanup to bound memory
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) {
    const kept = arr.filter((t) => now - t < WINDOW_MS);
    if (kept.length) hits.set(k, kept);
    else hits.delete(k);
  }
}, WINDOW_MS).unref();
