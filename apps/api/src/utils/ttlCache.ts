type TtlCacheEntry<V> = {
  expiresAt: number;
  value: V;
};

type TtlCacheOptions = {
  maxEntries?: number;
  now?: () => number;
  ttlMs: number;
};

export const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60;
export const DEFAULT_MAX_ENTRIES = 500;

export class TtlCache<K, V> {
  readonly #entries = new Map<K, TtlCacheEntry<V>>();
  readonly #maxEntries: number;
  readonly #now: () => number;
  readonly #ttlMs: number;

  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, now = Date.now, ttlMs }: TtlCacheOptions) {
    this.#maxEntries = maxEntries;
    this.#now = now;
    this.#ttlMs = ttlMs;
  }

  get size() {
    this.#purgeExpired();
    return this.#entries.size;
  }

  clear() {
    this.#entries.clear();
  }

  delete(key: K) {
    return this.#entries.delete(key);
  }

  get(key: K) {
    const entry = this.#entries.get(key);

    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= this.#now()) {
      this.#entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K) {
    return this.get(key) !== undefined;
  }

  set(key: K, value: V) {
    this.#purgeExpired();

    if (this.#entries.has(key)) {
      this.#entries.delete(key);
    }

    this.#entries.set(key, {
      expiresAt: this.#now() + this.#ttlMs,
      value,
    });

    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;

      if (oldestKey === undefined) {
        break;
      }

      this.#entries.delete(oldestKey);
    }

    return this;
  }

  #purgeExpired() {
    const currentTime = this.#now();

    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= currentTime) {
        this.#entries.delete(key);
      }
    }
  }
}
