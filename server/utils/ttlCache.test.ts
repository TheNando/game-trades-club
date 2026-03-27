import { describe, expect, test } from 'bun:test';
import { TtlCache } from './ttlCache';

describe('TtlCache', () => {
  test('returns a value before its ttl expires', () => {
    let now = 1_000;
    const cache = new TtlCache<string, string>({
      ttlMs: 100,
      now: () => now,
    });

    cache.set('game-42', 'https://cf.geekdo-images.com/game-42/image');

    expect(cache.get('game-42')).toBe('https://cf.geekdo-images.com/game-42/image');

    now += 99;

    expect(cache.get('game-42')).toBe('https://cf.geekdo-images.com/game-42/image');
  });

  test('evicts a value after its ttl expires', () => {
    let now = 1_000;
    const cache = new TtlCache<string, string>({
      ttlMs: 100,
      now: () => now,
    });

    cache.set('game-42', 'https://cf.geekdo-images.com/game-42/image');

    now += 100;

    expect(cache.get('game-42')).toBeUndefined();
    expect(cache.has('game-42')).toBeFalse();
    expect(cache.size).toBe(0);
  });

  test('refreshes ttl when a key is overwritten', () => {
    let now = 1_000;
    const cache = new TtlCache<string, string>({
      ttlMs: 100,
      now: () => now,
    });

    cache.set('game-42', 'first');

    now += 50;
    cache.set('game-42', 'second');

    now += 75;

    expect(cache.get('game-42')).toBe('second');

    now += 26;

    expect(cache.get('game-42')).toBeUndefined();
  });

  test('evicts the oldest live entry when max entries is exceeded', () => {
    const cache = new TtlCache<string, string>({
      ttlMs: 1_000,
      maxEntries: 2,
    });

    cache.set('a', 'first');
    cache.set('b', 'second');
    cache.set('c', 'third');

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('second');
    expect(cache.get('c')).toBe('third');
  });

  test('supports delete and clear like a key value store', () => {
    const cache = new TtlCache<string, string>({ ttlMs: 1_000 });

    cache.set('a', 'first');
    cache.set('b', 'second');

    expect(cache.delete('a')).toBeTrue();
    expect(cache.delete('missing')).toBeFalse();
    expect(cache.has('a')).toBeFalse();

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('b')).toBeUndefined();
  });
});
