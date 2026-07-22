import { BunRequest } from 'bun';
import {
  createListingSchema,
  listingQuerySchema,
  updateListingSchema,
  type CreateListingRequest,
} from '@game-trades-club/shared/validation';
import { db } from '../db/client';
import { createListingsStore, type ListingFilters } from '../db/listingsTable';
import { syncGameInfoIfMissing } from '../bgg/syncGameInfo';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson, validationError } from '../utils/http';
import { randomToken } from '../utils/security';

type ListingDetailStore = Pick<ReturnType<typeof createListingsStore>, 'findListingDetailById'>;

type CreateGetListingDetailOptions = {
  listingsStore?: ListingDetailStore;
};

type ListingsStore = Pick<
  ReturnType<typeof createListingsStore>,
  'createListing' | 'listFilteredListings' | 'removeListing' | 'updateListing'
>;

type GetListingsStore = Pick<ReturnType<typeof createListingsStore>, 'listFilteredListings'>;

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

/** Validates and normalizes a request body for listing creation. */
export function parseCreateListingBody(body: unknown): CreateListingRequest | Response {
  const parsed = createListingSchema.safeParse(body);
  return parsed.success ? parsed.data : validationError(parsed.error);
}

function parseIntListQueryParam(values: string[], fieldName: string): number[] | Response {
  const flattened = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed: number[] = [];
  for (const value of flattened) {
    const num = Number(value);
    if (!Number.isInteger(num)) return badRequest(`${fieldName} must be a list of integers`);
    parsed.push(num);
  }
  return parsed;
}

function parseConditionQueryParam(values: string[]): string[] | Response {
  const flattened = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed = createListingSchema.shape.condition.array().safeParse(flattened);
  if (!parsed.success) return validationError(parsed.error);
  return flattened;
}

/** Parses supported listing filters from a URL query string. */
export function parseListingFilters(searchParams: URLSearchParams): ListingFilters | Response {
  const query = listingQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!query.success) return validationError(query.error);

  const filters: ListingFilters = {};

  if (query.data.q) filters.query = query.data.q;

  if (query.data.user_id) filters.userId = query.data.user_id;

  if (query.data.status) filters.status = query.data.status;

  const conditions = parseConditionQueryParam(searchParams.getAll('condition'));
  if (conditions instanceof Response) return conditions;
  if (conditions.length > 0) filters.conditions = conditions;

  if (query.data.price_min != null) filters.priceMin = query.data.price_min;
  if (query.data.price_max != null) filters.priceMax = query.data.price_max;
  if (query.data.year_min != null) filters.yearMin = query.data.year_min;
  if (query.data.year_max != null) filters.yearMax = query.data.year_max;
  if (query.data.players != null) filters.players = query.data.players;
  if (query.data.playtime != null) filters.playtime = query.data.playtime;

  const categoryIds = parseIntListQueryParam(searchParams.getAll('category'), 'category');
  if (categoryIds instanceof Response) return categoryIds;
  if (categoryIds.length > 0) filters.categoryIds = categoryIds;

  const mechanicIds = parseIntListQueryParam(searchParams.getAll('mechanic'), 'mechanic');
  if (mechanicIds instanceof Response) return mechanicIds;
  if (mechanicIds.length > 0) filters.mechanicIds = mechanicIds;

  if (query.data.weight_min != null) filters.weightMin = query.data.weight_min;
  if (query.data.weight_max != null) filters.weightMax = query.data.weight_max;
  if (query.data.min_rating != null) filters.minRating = query.data.min_rating;
  if (query.data.rating_type) filters.ratingType = query.data.rating_type;

  return filters;
}

/** Creates the handler that lists filtered marketplace listings. */
export function createGetListings({
  listingsStore = defaultListingsStore,
}: CreateGetListingsOptions = {}) {
  return async function getListings(
    _: BunRequest<'/api/listings'>,
    { auth, url }: RouteDependencies,
  ) {
    const filters = parseListingFilters(url.searchParams);
    if (filters instanceof Response) return filters;

    return json({ items: listingsStore.listFilteredListings(filters, auth.userId) });
  };
}

/** Lists filtered marketplace listings using application dependencies. */
export const getListings = createGetListings();

/** Creates the handler that returns one listing's details. */
export function createGetListingDetail({
  listingsStore = defaultListingsStore,
}: CreateGetListingDetailOptions = {}) {
  return async function getListingDetail(
    _: BunRequest<'/api/listings/:id'>,
    { auth, url }: RouteDependencies,
  ) {
    const listingId = matchListingId(url);
    if (!listingId) return badRequest('Invalid listing ID');

    const listing = listingsStore.findListingDetailById(listingId, auth.userId);
    if (!listing) return notFound('Listing not found');

    return json({ item: listing });
  };
}

/** Returns one listing's details using application dependencies. */
export const getListingDetail = createGetListingDetail();

/** Creates the handler that creates a marketplace listing. */
export function createPostListing({
  createListingId = () => randomToken(18),
  listingsStore = defaultListingsStore,
  logger = console,
  syncGameInfoIfMissing: syncCreditsIfMissing = syncGameInfoIfMissing,
}: CreatePostListingOptions = {}) {
  return async function postListing(
    request: BunRequest<'/api/listings'>,
    { auth }: RouteDependencies,
  ) {
    const parsed = parseCreateListingBody(await readJson<unknown>(request));
    if (parsed instanceof Response) return parsed;

    const listing = listingsStore.createListing(auth.userId, {
      id: createListingId(),
      description: parsed.description ?? null,
      game_id: parsed.game_id!,
      condition: parsed.condition,
      price: parsed.price!,
      status: parsed.status,
      preferred_shop_id: parsed.preferred_shop_id ?? null,
    });

    try {
      await syncCreditsIfMissing(parsed.game_id);
    } catch (error) {
      logger.error(`Unable to sync game credits for game ${parsed.game_id}`, error);
    }

    return json({ item: listing }, { status: 201 });
  };
}

/** Creates a marketplace listing using application dependencies. */
export const postListing = createPostListing();

type PatchListingStore = Pick<ReturnType<typeof createListingsStore>, 'updateListing'>;

type CreatePatchListingOptions = {
  listingsStore?: PatchListingStore;
};

/** Creates the handler that updates an owned listing. */
export function createPatchListing({
  listingsStore = defaultListingsStore,
}: CreatePatchListingOptions = {}) {
  return async function patchListing(
    request: BunRequest<'/api/listings/:id'>,
    { auth, url }: RouteDependencies,
  ) {
    const listingId = matchListingId(url);
    if (!listingId) return badRequest('Invalid listing ID');

    const result = updateListingSchema.safeParse(await readJson<unknown>(request));
    if (!result.success) return validationError(result.error);
    const body = result.data;

    const updated = listingsStore.updateListing(auth.userId, listingId, {
      description: body.description,
      condition: body.condition,
      game_id: body.game_id ?? undefined,
      price: body.price ?? undefined,
      status: body.status,
      preferred_shop_id: body.preferred_shop_id,
    });

    return updated ? new Response(null, { status: 204 }) : notFound();
  };
}

/** Updates an owned listing using application dependencies. */
export const patchListing = createPatchListing();

type DeleteListingStore = Pick<ReturnType<typeof createListingsStore>, 'removeListing'>;

type CreateDeleteListingOptions = {
  listingsStore?: DeleteListingStore;
};

/** Creates the handler that deletes an owned listing. */
export function createDeleteListing({
  listingsStore = defaultListingsStore,
}: CreateDeleteListingOptions = {}) {
  return async function deleteListing(
    _: BunRequest<'/api/listings/:id'>,
    { auth, url }: RouteDependencies,
  ) {
    const listingId = matchListingId(url);
    if (!listingId) return badRequest('Invalid listing ID');

    const deleted = listingsStore.removeListing(auth.userId, listingId);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  };
}

/** Deletes an owned listing using application dependencies. */
export const deleteListing = createDeleteListing();
