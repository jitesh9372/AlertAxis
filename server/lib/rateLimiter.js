/**
 * Simple in-process per-user rate limiter.
 * Limits each user to maxRequests per windowMs.
 * Works without external dependencies; swap for redis-based limiter in multi-server prod.
 */

const windows = new Map(); // userId -> { count, resetAt }

export function rateLimiter({
  maxRequests = 10,
  windowMs = 60 * 1000,
} = {}) {
  return (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.ip || 'anonymous';
    const now = Date.now();

    let entry = windows.get(userId);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      windows.set(userId, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        error: '⏳ Too many messages. Please wait a moment before trying again.',
        retryAfter: retryAfterSeconds,
      });
    }

    // Clean up old entries every 1000 requests to avoid memory leak
    if (windows.size > 1000) {
      for (const [k, v] of windows.entries()) {
        if (now > v.resetAt) windows.delete(k);
      }
    }

    next();
  };
}
