import { BunRequest } from 'bun';
import { RouteDependencies } from '../middleware/dependencies';
import { badGateway, badRequest, json, notFound } from '../utils/http';
import { DEFAULT_CACHE_TTL_MS, DEFAULT_MAX_ENTRIES, TtlCache } from '../utils/ttlCache';

const GEEKDO_IMAGE_URL_RE = /https:\/\/[^"'\s<>]*geekdo-images\.com[^"'\s<>]*/i;
const PRELOAD_GEEKDO_IMAGE_URL_RE =
  /<link\b(?=[^>]*\brel=["']?preload["']?)(?=[^>]*\bas=["']?image["']?)[^>]*\bhref=["'](https:\/\/[^"'\s<>]*geekdo-images\.com[^"'\s<>]*)["'][^>]*>/i;

type GetBggImageOptions = {
  cacheMaxEntries?: number;
  cacheTtlMs?: number;
  fetchFn?: typeof fetch;
  now?: () => number;
};

function extractBggImageUrl(html: string) {
  const preloadMatch = html.match(PRELOAD_GEEKDO_IMAGE_URL_RE);
  if (preloadMatch?.[1]) {
    return preloadMatch[1];
  }

  return html.match(GEEKDO_IMAGE_URL_RE)?.[0] ?? null;
}

/**
 * Resolves a BoardGameGeek cover image URL for the requested game id.
 * Fetches the BGG page, extracts a geekdo image URL, and caches it in memory.
 */
export function createGetBggImage({
  cacheMaxEntries = DEFAULT_MAX_ENTRIES,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  fetchFn = fetch,
  now = Date.now,
}: GetBggImageOptions = {}) {
  const cache = new TtlCache<string, string>({
    maxEntries: cacheMaxEntries,
    now,
    ttlMs: cacheTtlMs,
  });

  return async function getBggImage(
    _: BunRequest<"/api/bgg/image">,
    { url }: RouteDependencies
  ) {
    const id = url.searchParams.get('id') ?? '';

    if (!/^\d+$/.test(id)) {
      return badRequest('Invalid id parameter');
    }

    const cachedUrl = cache.get(id);
    if (cachedUrl) {
      return json({ url: cachedUrl });
    }

    try {
      const bggUrl = `https://boardgamegeek.com/boardgame/${id}`;
      const response = await fetchFn(bggUrl);

      if (response.status === 404) {
        return notFound('Game not found on BGG');
      }

      if (!response.ok) {
        return badGateway('Failed to fetch BGG page');
      }

      const html = await response.text();
      const imgSrc = extractBggImageUrl(html);

      if (!imgSrc) {
        return notFound('Image not found');
      }

      cache.set(id, imgSrc);

      return json({ url: imgSrc });
    } catch (error) {
      console.error('Error fetching BGG image:', error);
      return badGateway('Failed to fetch BGG page');
    }
  };
}

export const getBggImage = createGetBggImage();
