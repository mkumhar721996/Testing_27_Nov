// Fixed-window in-memory rate limiter and trusted-proxy-aware client IP lookup.
// Per-instance only: a shared store is needed to enforce limits across replicas.

const MAX_KEYS = 10_000;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  if (hits.size >= MAX_KEYS && !hits.has(key)) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    // Still full of live windows: evict the oldest so memory stays bounded.
    while (hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value as string);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export function resetRateLimits() {
  hits.clear();
}

export function sizeForTest() {
  return hits.size;
}

// Entries to the left of the last TRUSTED_PROXY_COUNT hops of X-Forwarded-For are
// client-controlled, so count from the right: the entry our nearest trusted proxy appended.
export function clientIp(request: Request): string | null {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_COUNT) || 1);
  const parts = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= hops ? parts[parts.length - hops] : null;
}
