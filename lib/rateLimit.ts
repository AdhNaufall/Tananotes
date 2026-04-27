type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, options: { limit: number; windowMs: number }) {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetAt <= now) {
    const nextEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + options.windowMs,
    };

    rateLimitStore.set(key, nextEntry);

    return {
      allowed: true,
      remaining: options.limit - 1,
      resetAt: nextEntry.resetAt,
    };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  rateLimitStore.set(key, existing);

  return {
    allowed: true,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
  };
}
