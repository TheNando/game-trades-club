type TtlCacheEntry<V> = {
  expiresAt: number;
  value: V;
};

type TtlCacheOptions = {
  maxEntries?: number;
  now?: () => number;
  ttlMs: number;
};

/** Defines the default one-hour cache lifetime. */
export const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60;

/** Defines the default maximum number of cache entries. */
export const DEFAULT_MAX_ENTRIES = 500;

/** Stores values in insertion order until they expire or capacity is reached. */
export class TtlCache<K, V> {
  readonly #entries = new Map<K, TtlCacheEntry<V>>();
  readonly #maxEntries: number;
  readonly #now: () => number;
  readonly #ttlMs: number;

  /** Creates a cache with the supplied expiration and capacity settings. */
  constructor({ maxEntries = DEFAULT_MAX_ENTRIES, now = Date.now, ttlMs }: TtlCacheOptions) {
    this.#maxEntries = maxEntries;
    this.#now = now;
    this.#ttlMs = ttlMs;
  }

  /** Returns the number of non-expired entries. */
  get size() {
    this.#purgeExpired();
    return this.#entries.size;
  }

  /** Removes every cached entry. */
  clear() {
    this.#entries.clear();
  }

  /** Removes one entry and reports whether it existed. */
  delete(key: K) {
    return this.#entries.delete(key);
  }

  /** Returns a non-expired entry, if present. */
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

  /** Reports whether a non-expired entry exists. */
  has(key: K) {
    return this.get(key) !== undefined;
  }

  /** Stores a value and evicts the oldest entries beyond capacity. */
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
