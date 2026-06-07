import { BunRequest } from 'bun';
import { db } from '../db/client';
import { createListingsStore } from '../db/listingsTable';
import { syncGameCreditsIfMissing } from '../bgg/syncGameCredits';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type ListingDetailStore = Pick<
  ReturnType<typeof createListingsStore>,
  'findListingDetailById'
>;

type CreateGetListingDetailOptions = {
  listingsStore?: ListingDetailStore;
};

type ListingBody = {
  description?: string;
  game_id?: string | number;
  condition?: string;
  price?: string | number;
  status?: 'open' | 'pending' | 'complete';
  preferred_shop_id?: string | null;
  image_ids?: string;
  image_url?: string;
  image_thumbnail_url?: string;
};

type ParsedCreateListingBody = {
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  preferred_shop_id: string | null;
};

type ListingsStore = Pick<
  ReturnType<typeof createListingsStore>,
  'createListing' | 'listAllListings' | 'removeListing' | 'updateListing'
>;

type CreatePostListingOptions = {
  createListingId?: () => string;
  listingsStore?: ListingsStore;
  logger?: Pick<Console, 'error'>;
  syncGameCreditsIfMissing?: (gameId: number) => Promise<boolean>;
};

const defaultListingsStore = createListingsStore(db);

function matchListingId(url: URL) {
  return url.pathname.match(/^\/api\/listings\/([^/]+)$/)?.[1];
}

function parseIntegerField(value: string | number | undefined, fieldName: string) {
  if (value === undefined || value === null || value === '') return null;

  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return null;

  const parsed = typeof normalized === 'number' ? normalized : Number(normalized);

  if (!Number.isInteger(parsed)) {
    return badRequest(`${fieldName} must be an integer`);
  }

  return parsed;
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function parseCreateListingBody(
  body: ListingBody | null
): ParsedCreateListingBody | Response {
  if (!body?.condition) return badRequest('condition is required');
  if (!body?.status) return badRequest('status is required');

  const gameId = parseIntegerField(body.game_id, 'game_id');
  if (gameId instanceof Response) return gameId;
  if (gameId === null) return badRequest('game_id is required');
  if (gameId <= 0) return badRequest('game_id must be greater than zero');

  const price = parseIntegerField(body.price, 'price');
  if (price instanceof Response) return price;
  if (price === null) return badRequest('price is required');
  if (price < 0) return badRequest('price must be zero or greater');

  const preferredShopId = parsePreferredShopId(body.preferred_shop_id);
  if (preferredShopId instanceof Response) return preferredShopId;

  return {
    description: normalizeOptionalText(body.description),
    game_id: gameId,
    condition: body.condition,
    price,
    status: body.status,
    preferred_shop_id: preferredShopId,
  };
}

function parsePreferredShopId(value: string | null | undefined): string | null | Response {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return badRequest('preferred_shop_id must be a string');
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function getListings(
  _: BunRequest<'/api/listings'>,
  __: RouteDependencies
) {
  return json({ items: defaultListingsStore.listAllListings() });
}

export function createGetListingDetail({
  listingsStore = defaultListingsStore,
}: CreateGetListingDetailOptions = {}) {
  return async function getListingDetail(
    _: BunRequest<'/api/listings/:id'>,
    { url }: RouteDependencies
  ) {
    const listingId = matchListingId(url);
    if (!listingId) return badRequest('Invalid listing ID');

    const listing = listingsStore.findListingDetailById(listingId);
    if (!listing) return notFound('Listing not found');

    return json({ item: listing });
  };
}

export const getListingDetail = createGetListingDetail();

export function createPostListing({
  createListingId = () => randomToken(18),
  listingsStore = defaultListingsStore,
  logger = console,
  syncGameCreditsIfMissing: syncCreditsIfMissing = syncGameCreditsIfMissing,
}: CreatePostListingOptions = {}) {
  return async function postListing(
    request: BunRequest<'/api/listings'>,
    { auth }: RouteDependencies
  ) {
    const parsed = parseCreateListingBody(await readJson<ListingBody>(request));
    if (parsed instanceof Response) return parsed;

    const listing = listingsStore.createListing(auth.userId, {
      id: createListingId(),
      ...parsed,
    });

    try {
      await syncCreditsIfMissing(parsed.game_id);
    } catch (error) {
      logger.error(`Unable to sync game credits for game ${parsed.game_id}`, error);
    }

    return json({ item: listing }, { status: 201 });
  };
}

export const postListing = createPostListing();

export async function patchListing(
  request: BunRequest<'/api/listings'>,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid listing ID');

  const body = await readJson<ListingBody>(request);
  if (!body) return badRequest('Invalid JSON body');

  const gameId = parseIntegerField(body.game_id, 'game_id');
  if (gameId instanceof Response) return gameId;
  if (gameId !== null && gameId <= 0) return badRequest('game_id must be greater than zero');

  const price = parseIntegerField(body.price, 'price');
  if (price instanceof Response) return price;
  if (price !== null && price < 0) {
    return badRequest('price must be zero or greater');
  }

  let preferredShopId: string | null | undefined = undefined;
  if ('preferred_shop_id' in body) {
    const parsed = parsePreferredShopId(body.preferred_shop_id);
    if (parsed instanceof Response) return parsed;
    preferredShopId = parsed;
  }

  const updated = defaultListingsStore.updateListing(auth.userId, listingId, {
    description: body.description === undefined ? undefined : normalizeOptionalText(body.description),
    condition: body.condition,
    game_id: gameId ?? undefined,
    price: price ?? undefined,
    status: body.status,
    preferred_shop_id: preferredShopId,
  });

  return updated ? new Response(null, { status: 204 }) : notFound();
}

export async function deleteListing(
  _: BunRequest<'/api/listings'>,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid trade ID');

  const deleted = defaultListingsStore.removeListing(auth.userId, listingId);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
