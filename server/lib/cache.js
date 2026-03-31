/**
 * In-memory TTL cache for Gemini responses.
 * Identical/similar questions reuse cached answers → saves quota.
 * For multi-server (production), swap with Redis.
 */
class TTLCache {
  constructor() {
    this.store = new Map();
    this._startCleanup();
  }

  set(key, value, ttlSeconds = 3600) {
    this.store.set(key.toLowerCase(), { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  get(key) {
    const entry = this.store.get(key.toLowerCase());
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key.toLowerCase());
      return null;
    }
    return entry.value;
  }

  _startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) this.store.delete(k);
      }
    }, 5 * 60 * 1000);
  }
}

export const responseCache = new TTLCache();
