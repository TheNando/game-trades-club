import { BunRequest } from 'bun';
import { VALID_CONDITIONS } from '@game-trades-club/shared/constants';
import { db } from '../db/client';
import { createListingsStore, type ListingFilters } from '../db/listingsTable';
import { syncGameInfoIfMissing } from '../bgg/syncGameInfo';
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
  'createListing' | 'listFilteredListings' | 'removeListing' | 'updateListing'
>;

type GetListingsStore = Pick<
  ReturnType<typeof createListingsStore>,
  'listFilteredListings'
>;

type CreateGetListingsOptions = {
  listingsStore?: GetListingsStore;
};

type CreatePostListingOptions = {
  createListingId?: () => string;
  listingsStore?: ListingsStore;
  logger?: Pick<Console, 'error'>;
  syncGameInfoIfMissing?: (gameId: number) => Promise<boolean>;
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

function parseIntQueryParam(value: string | null, fieldName: string): number | null | Response {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return badRequest(`${fieldName} must be an integer`);
  return parsed;
}

function parseFloatQueryParam(value: string | null, fieldName: string): number | null | Response {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return badRequest(`${fieldName} must be a number`);
  return parsed;
}

function parseIntListQueryParam(values: string[], fieldName: string): number[] | Response {
  const flattened = values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  const parsed: number[] = [];
  for (const value of flattened) {
    const num = Number(value);
    if (!Number.isInteger(num)) return badRequest(`${fieldName} must be a list of integers`);
    parsed.push(num);
  }
  return parsed;
}

function parseConditionQueryParam(values: string[]): string[] | Response {
  const flattened = values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
  for (const condition of flattened) {
    if (!VALID_CONDITIONS.has(condition)) return badRequest(`condition must be one of: ${[...VALID_CONDITIONS].join(', ')}`);
  }
  return flattened;
}

export function parseListingFilters(searchParams: URLSearchParams): ListingFilters | Response {
  const filters: ListingFilters = {};

  const conditions = parseConditionQueryParam(searchParams.getAll('condition'));
  if (conditions instanceof Response) return conditions;
  if (conditions.length > 0) filters.conditions = conditions;

  const priceMin = parseIntQueryParam(searchParams.get('price_min'), 'price_min');
  if (priceMin instanceof Response) return priceMin;
  if (priceMin !== null) filters.priceMin = priceMin;

  const priceMax = parseIntQueryParam(searchParams.get('price_max'), 'price_max');
  if (priceMax instanceof Response) return priceMax;
  if (priceMax !== null) filters.priceMax = priceMax;

  const yearMin = parseIntQueryParam(searchParams.get('year_min'), 'year_min');
  if (yearMin instanceof Response) return yearMin;
  if (yearMin !== null) filters.yearMin = yearMin;

  const yearMax = parseIntQueryParam(searchParams.get('year_max'), 'year_max');
  if (yearMax instanceof Response) return yearMax;
  if (yearMax !== null) filters.yearMax = yearMax;

  const players = parseIntQueryParam(searchParams.get('players'), 'players');
  if (players instanceof Response) return players;
  if (players !== null) filters.players = players;

  const playtime = parseIntQueryParam(searchParams.get('playtime'), 'playtime');
  if (playtime instanceof Response) return playtime;
  if (playtime !== null) filters.playtime = playtime;

  const categoryIds = parseIntListQueryParam(searchParams.getAll('category'), 'category');
  if (categoryIds instanceof Response) return categoryIds;
  if (categoryIds.length > 0) filters.categoryIds = categoryIds;

  const mechanicIds = parseIntListQueryParam(searchParams.getAll('mechanic'), 'mechanic');
  if (mechanicIds instanceof Response) return mechanicIds;
  if (mechanicIds.length > 0) filters.mechanicIds = mechanicIds;

  const weightMin = parseFloatQueryParam(searchParams.get('weight_min'), 'weight_min');
  if (weightMin instanceof Response) return weightMin;
  if (weightMin !== null) filters.weightMin = weightMin;

  const weightMax = parseFloatQueryParam(searchParams.get('weight_max'), 'weight_max');
  if (weightMax instanceof Response) return weightMax;
  if (weightMax !== null) filters.weightMax = weightMax;

  const minRating = parseFloatQueryParam(searchParams.get('min_rating'), 'min_rating');
  if (minRating instanceof Response) return minRating;
  if (minRating !== null) filters.minRating = minRating;

  const ratingTypeValue = searchParams.get('rating_type');
  if (ratingTypeValue !== null) {
    if (ratingTypeValue !== 'average' && ratingTypeValue !== 'adjusted') {
      return badRequest('rating_type must be "average" or "adjusted"');
    }
    filters.ratingType = ratingTypeValue;
  }

  return filters;
}

export function createGetListings({
  listingsStore = defaultListingsStore,
}: CreateGetListingsOptions = {}) {
  return async function getListings(
    _: BunRequest<'/api/listings'>,
    { url }: RouteDependencies
  ) {
    const filters = parseListingFilters(url.searchParams);
    if (filters instanceof Response) return filters;

    return json({ items: listingsStore.listFilteredListings(filters) });
  };
}

export const getListings = createGetListings();

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
  syncGameInfoIfMissing: syncCreditsIfMissing = syncGameInfoIfMissing,
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

type PatchListingStore = Pick<
  ReturnType<typeof createListingsStore>,
  'updateListing'
>;

type CreatePatchListingOptions = {
  listingsStore?: PatchListingStore;
};

export function createPatchListing({
  listingsStore = defaultListingsStore,
}: CreatePatchListingOptions = {}) {
  return async function patchListing(
    request: BunRequest<'/api/listings/:id'>,
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

    const updated = listingsStore.updateListing(auth.userId, listingId, {
      description: body.description === undefined ? undefined : normalizeOptionalText(body.description),
      condition: body.condition,
      game_id: gameId ?? undefined,
      price: price ?? undefined,
      status: body.status,
      preferred_shop_id: preferredShopId,
    });

    return updated ? new Response(null, { status: 204 }) : notFound();
  };
}

export const patchListing = createPatchListing();

type DeleteListingStore = Pick<
  ReturnType<typeof createListingsStore>,
  'removeListing'
>;

type CreateDeleteListingOptions = {
  listingsStore?: DeleteListingStore;
};

export function createDeleteListing({
  listingsStore = defaultListingsStore,
}: CreateDeleteListingOptions = {}) {
  return async function deleteListing(
    _: BunRequest<'/api/listings/:id'>,
    { auth, url }: RouteDependencies
  ) {
    const listingId = matchListingId(url);
    if (!listingId) return badRequest('Invalid listing ID');

    const deleted = listingsStore.removeListing(auth.userId, listingId);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  };
}

export const deleteListing = createDeleteListing();
