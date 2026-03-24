import { createError, getHeader } from "h3";

type RateLimitHit = { count: number; resetAt: number };

function getStore(): Map<string, RateLimitHit> {
  const g = globalThis as any;
  if (!g.__bokkuRateLimitStore) {
    g.__bokkuRateLimitStore = new Map<string, RateLimitHit>();
  }
  return g.__bokkuRateLimitStore as Map<string, RateLimitHit>;
}

export function getClientIp(event: any): string {
  const forwarded = String(getHeader(event, "x-forwarded-for") || "");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return (
    String(
      (event?.node?.req?.socket as any)?.remoteAddress ||
        (event?.node?.req as any)?.connection?.remoteAddress ||
        "unknown",
    ) || "unknown"
  );
}

export function enforceRateLimit(
  event: any,
  opts: { name: string; limit: number; windowMs: number; key?: string },
) {
  const now = Date.now();
  const store = getStore();
  const ip = getClientIp(event);
  const key = opts.key || ip;
  const bucketKey = `${opts.name}:${key}`;

  const existing = store.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    store.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return;
  }

  existing.count += 1;
  store.set(bucketKey, existing);

  if (existing.count > opts.limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      message: "Too many requests. Please try again later.",
    });
  }
}
