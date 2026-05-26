import { describe, expect, test } from 'bun:test';
import { createGetBggImage } from './bgg';

function createDeps(url: string) {
  return {
    auth: { userId: 'user-1', sessionId: 'session-1' },
    url: new URL(url),
  };
}

describe('createGetBggImage', () => {
  test('rejects non-numeric ids', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => {
        throw new Error('fetch should not be called');
      },
    });

    const request = new Request('http://example.test/api/bgg/image?id=abc');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid id parameter' });
  });

  test('returns not found when BGG returns 404', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => new Response('missing', { status: 404 }),
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Game not found on BGG' });
  });

  test('returns bad gateway when BGG returns a non-404 failure', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => new Response('broken', { status: 503 }),
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: 'Failed to fetch BGG page' });
  });

  test('extracts the first geekdo image URL from the page HTML', async () => {
    const html = `
      <html>
        <head>
          <link rel="preload" as="image" href="https://cf.geekdo-images.com/cover-image-1/original/img12345">
          <meta property="og:image" content="https://cf.geekdo-images.com/cover-image-2/original/img67890">
        </head>
      </html>
    `;
    const handler = createGetBggImage({
      fetchFn: async () => new Response(html, { status: 200 }),
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: 'https://cf.geekdo-images.com/cover-image-1/original/img12345',
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
          `<meta property="og:image" content="https://cf.geekdo-images.com/game-${fetchCount}/image">`,
          { status: 200 },
        );
      },
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

  test('evicts the oldest cache entry when the cache reaches its size limit', async () => {
    let fetchCount = 0;
    const handler = createGetBggImage({
      cacheMaxEntries: 1,
      fetchFn: async (input) => {
        fetchCount += 1;
        const url = input;
        const parts = url.split('/');
        const id = parts[parts.length - 1];

        return new Response(
          `<meta property="og:image" content="https://cf.geekdo-images.com/game-${id}-${fetchCount}/image">`,
          { status: 200 },
        );
      },
    });

    const firstRequest = new Request('http://example.test/api/bgg/image?id=42');
    const secondRequest = new Request('http://example.test/api/bgg/image?id=84');

    await handler(firstRequest as never, createDeps(firstRequest.url));
    await handler(secondRequest as never, createDeps(secondRequest.url));

    const third = await handler(firstRequest as never, createDeps(firstRequest.url));

    expect(third.status).toBe(200);
    expect(await third.json()).toEqual({
      url: 'https://cf.geekdo-images.com/game-42-3/image',
    });
    expect(fetchCount).toBe(3);
  });

  test('returns not found when no geekdo image URL exists in the page', async () => {
    const handler = createGetBggImage({
      fetchFn: async () => new Response('<html><head></head><body>No image</body></html>', {
        status: 200,
      }),
    });

    const request = new Request('http://example.test/api/bgg/image?id=42');
    const response = await handler(request as never, createDeps(request.url));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Image not found' });
  });
});
