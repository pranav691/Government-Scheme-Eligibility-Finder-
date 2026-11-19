// Small in-memory sliding-window rate limiter for a single Node process.
// Enough to stop password guessing and search flooding on a local /
// single-server deployment; use a shared store (Redis) if scaled out.
const globalForLimit = globalThis;
const buckets = (globalForLimit.__rateBuckets ||= new Map());

export function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",")[0].trim() : "") || "local";
}

/**
 * Returns { limited: boolean, retryAfter: seconds }.
 * Allows `max` hits per `windowMs` for the given key.
 */
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);

  if (hits.length >= max) {
    buckets.set(key, hits);
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)),
    };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Keep the map from growing forever.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }

  return { limited: false, retryAfter: 0 };
}

export function tooManyRequests(retryAfter) {
  return Response.json(
    { success: false, error: "Too many requests. Please wait and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
