import { describe, expect, test } from 'bun:test';
import { createGetBggImage } from './bgg';

function createDeps(url: string) {
  return {
    auth: { userId: 'user-1', sessionId: 'session-1' },
    url: new URL(url),
  };
}

type StubGame = {
  id: number;
  name: string;
  image_url: string | null;
  year: number | null;
  is_expansion: number;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
};

function createGamesStoreStub(initial: Record<number, StubGame | null> = {}) {
  const games = new Map<number, StubGame | null>(
    Object.entries(initial).map(([key, value]) => [Number(key), value])
  );
  const updates: Array<{ id: number; url: string; }> = [];

  return {
    games,
    updates,
    store: {
      findGameById(id: number) {
        return games.get(id) ?? null;
      },
      updateGameImageUrl(id: number, imageUrl: string) {
        updates.push({ id, url: imageUrl });
        const existing = games.get(id);
        if (existing) games.set(id, { ...existing, image_url: imageUrl });
      },
    },
  };
}

function xmlWithImage(url: string) {
  return `<?xml version="1.0" encoding="utf-8"?>
    <items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
      <item type="boardgame" id="42">
        <thumbnail>https://cf.geekdo-images.com/thumb/img.jpg</thumbnail>
        <image>${url}</image>
      </item>
    </items>`;
}

describe('createGetBggImage', () => {
  test('rejects non-numeric ids', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => {
        throw new Error('fetch should not be called');
      },
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=abc');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid id parameter' });
  });

  test('returns the image URL from the games table without calling BGG', async () => {
    const { store } = createGamesStoreStub({
      42: {
        id: 42,
        name: 'Catan',
        image_url: 'https://cf.geekdo-images.com/cached/img.jpg',
        year: 1995,
        is_expansion: 0,
        min_players: null,
        max_players: null,
        min_playtime: null,
        max_playtime: null,
      },
    });

    const handler = createGetBggImage({
      fetchFn: async () => {
        throw new Error('fetch should not be called');
      },
      gamesStore: store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://cf.geekdo-images.com/cached/img.jpg',
    });
  });

  test('returns bad gateway when BGG returns a non-404 failure', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => new Response('broken', { status: 503 }),
      gamesStore: createGamesStoreStub({
        42: { id: 42, name: 'Catan', image_url: null, year: 1995, is_expansion: 0, min_players: null, max_players: null, min_playtime: null, max_playtime: null },
      }).store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to fetch BGG page' });
  });

  test('extracts the image URL from the BGG XML API and persists it on the game', async () => {
    const stub = createGamesStoreStub({
      42: { id: 42, name: 'Catan', image_url: null, year: 1995, is_expansion: 0, min_players: null, max_players: null, min_playtime: null, max_playtime: null },
    });

    const handler = createGetBggImage({
      fetchFn: async () =>
        new Response(xmlWithImage('https://cf.geekdo-images.com/cover/original.jpg'), {
          status: 200,
        }),
      gamesStore: stub.store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://cf.geekdo-images.com/cover/original.jpg',
    });
    expect(stub.updates).toEqual([
      { id: 42, url: 'https://cf.geekdo-images.com/cover/original.jpg' },
    ]);
  });

  test('decodes XML entities in the image URL', async () => {
    const handler = createGetBggImage({
      fetchFn: async () =>
        new Response(xmlWithImage('https://cf.geekdo-images.com/img?a=1&amp;b=2'), {
          status: 200,
        }),
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(await response.json()).toEqual({
      url: 'https://cf.geekdo-images.com/img?a=1&b=2',
    });
  });

  test('falls back to the thumbnail when no <image> tag is present', async () => {
    const xml = `<items><item type="boardgame" id="42">
      <thumbnail>https://cf.geekdo-images.com/thumb/only.jpg</thumbnail>
    </item></items>`;

    const handler = createGetBggImage({
      fetchFn: async () => new Response(xml, { status: 200 }),
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://cf.geekdo-images.com/thumb/only.jpg',
    });
  });

  test('uses the cache until the ttl expires', async () => {
    let now = 1_000;
    let fetchCount = 0;
    const handler = createGetBggImage({
      cacheTtlMs: 100,
      fetchFn: async () => {
        fetchCount += 1;
        return new Response(
          xmlWithImage(`https://cf.geekdo-images.com/game-${fetchCount}/image`),
          { status: 200 },
        );
      },
      gamesStore: createGamesStoreStub().store,
      now: () => now,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');

    const first = await handler(request as never, createDeps(request.url));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      url: 'https://cf.geekdo-images.com/game-1/image',
    });

    now += 50;

    const second = await handler(request as never, createDeps(request.url));
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({
      url: 'https://cf.geekdo-images.com/game-1/image',
    });

    now += 60;

    const third = await handler(request as never, createDeps(request.url));
    expect(third.status).toBe(200);
    expect(await third.json()).toEqual({
      url: 'https://cf.geekdo-images.com/game-2/image',
    });

    expect(fetchCount).toBe(2);
  });

  test('coalesces concurrent requests for the same id into a single fetch', async () => {
    let fetchCount = 0;
    const handler = createGetBggImage({
      fetchFn: async () => {
        fetchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return new Response(xmlWithImage('https://cf.geekdo-images.com/once/img.jpg'), {
          status: 200,
        });
      },
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const [a, b, c] = await Promise.all([
      handler(request as never, createDeps(request.url)),
      handler(request as never, createDeps(request.url)),
      handler(request as never, createDeps(request.url)),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(c.status).toBe(200);
    expect(fetchCount).toBe(1);
  });

  test('caches negative results to avoid re-fetching missing images', async () => {
    let fetchCount = 0;
    const handler = createGetBggImage({
      fetchFn: async () => {
        fetchCount += 1;
        return new Response('<items></items>', { status: 200 });
      },
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const first = await handler(request as never, createDeps(request.url));
    const second = await handler(request as never, createDeps(request.url));

    expect(first.status).toBe(404);
    expect(second.status).toBe(404);
    expect(fetchCount).toBe(1);
  });

  test('returns not found when no image URL exists in the XML response', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => new Response('<items></items>', { status: 200 }),
      gamesStore: createGamesStoreStub().store,
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Image not found' });
  });
});
