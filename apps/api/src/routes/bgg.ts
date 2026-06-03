import { BunRequest } from 'bun';
import { db } from '../db/client';
import { createGamesStore } from '../db/gamesTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badGateway, badRequest, json, notFound } from '../utils/http';
import { DEFAULT_CACHE_TTL_MS, DEFAULT_MAX_ENTRIES, TtlCache } from '../utils/ttlCache';

const IMAGE_TAG_RE = /<image>([^<]+)<\/image>/i;
const THUMBNAIL_TAG_RE = /<thumbnail>([^<]+)<\/thumbnail>/i;

type GamesStore = Pick<
  ReturnType<typeof createGamesStore>,
  'findGameById' | 'updateGameImageUrl'
>;

type GetBggImageOptions = {
  cacheMaxEntries?: number;
  cacheTtlMs?: number;
  fetchFn?: (input: string) => Promise<Response>;
  gamesStore?: GamesStore;
  now?: () => number;
};

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractBggImageUrl(xml: string) {
  const image = xml.match(IMAGE_TAG_RE)?.[1]?.trim();
  if (image) return decodeXmlEntities(image);

  const thumbnail = xml.match(THUMBNAIL_TAG_RE)?.[1]?.trim();
  if (thumbnail) return decodeXmlEntities(thumbnail);

  return null;
}

const defaultGamesStore = createGamesStore(db);

/**
 * Resolves a BoardGameGeek cover image URL for the requested game id.
 * Looks up the games table first; on miss, fetches BGG's XML API and
 * persists the resolved URL. Coalesces concurrent requests and caches
 * positive/negative results in memory.
 */
export function createGetBggImage({
  cacheMaxEntries = DEFAULT_MAX_ENTRIES,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  fetchFn = fetch,
  gamesStore = defaultGamesStore,
  now = Date.now,
}: GetBggImageOptions = {}) {
  const positiveCache = new TtlCache<string, string>({
    maxEntries: cacheMaxEntries,
    now,
    ttlMs: cacheTtlMs,
  });
  const negativeCache = new TtlCache<string, true>({
    maxEntries: cacheMaxEntries,
    now,
    ttlMs: cacheTtlMs,
  });
  const inFlight = new Map<string, Promise<string | null>>();

  async function resolveFromBgg(id: string): Promise<string | null> {
    const xmlUrl = `https://boardgamegeek.com/xmlapi2/thing?id=${id}`;
    const response = await fetchFn(xmlUrl);

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch BGG page');

    const xml = await response.text();
    return extractBggImageUrl(xml);
  }

  return async function getBggImage(
    _: BunRequest<"/api/bgg/image">,
    { url }: RouteDependencies
  ) {
    const id = url.searchParams.get('id') ?? '';
    if (!/^\d+$/.test(id)) return badRequest('Invalid id parameter');

    const cachedUrl = positiveCache.get(id);
    if (cachedUrl) return json({ url: cachedUrl });
    if (negativeCache.get(id)) return notFound('Image not found');

    const numericId = Number.parseInt(id, 10);
    const game = gamesStore.findGameById(numericId);
    if (game?.image_url) {
      positiveCache.set(id, game.image_url);
      return json({ url: game.image_url });
    }

    let pending = inFlight.get(id);
    if (!pending) {
      pending = resolveFromBgg(id).finally(() => inFlight.delete(id));
      inFlight.set(id, pending);
    }

    try {
      const imgSrc = await pending;
      if (!imgSrc) {
        negativeCache.set(id, true);
        return notFound('Image not found');
      }

      positiveCache.set(id, imgSrc);
      if (game) {
        try {
          gamesStore.updateGameImageUrl(numericId, imgSrc);
        } catch (error) {
          console.error('Unable to persist BGG image URL', error);
        }
      }

      return json({ url: imgSrc });
    } catch (error) {
      console.error('Error fetching BGG image:', error);
      return badGateway('Failed to fetch BGG page');
    }
  };
}

export const getBggImage = createGetBggImage();
