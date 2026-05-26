import { BunRequest } from 'bun';
import { createListing, listListingsByUser, removeListing, updateListing } from '../db/listingsTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type ListingBody = {
  description?: string;
  game_id?: string | number;
  condition?: string;
  price?: string | number;
  status?: 'open' | 'pending' | 'complete';
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
};

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

  return {
    description: normalizeOptionalText(body.description),
    game_id: gameId,
    condition: body.condition,
    price,
    status: body.status,
  };
}

export async function getListings(
  _: BunRequest<'/api/listings'>,
  { auth }: RouteDependencies
) {
  return json({ items: listListingsByUser(auth.userId) });
}

export async function postListing(
  request: BunRequest<'/api/listings'>,
  { auth }: RouteDependencies
) {
  const parsed = parseCreateListingBody(await readJson<ListingBody>(request));
  if (parsed instanceof Response) return parsed;

  const listing = createListing(auth.userId, {
    id: randomToken(18),
    ...parsed,
  });

  return json({ item: listing }, { status: 201 });
}

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

  const updated = updateListing(auth.userId, listingId, {
    description: body.description === undefined ? undefined : normalizeOptionalText(body.description),
    game_id: gameId ?? undefined,
    condition: body.condition,
    price: price ?? undefined,
    status: body.status,
  });

  return updated ? new Response(null, { status: 204 }) : notFound();
}

export async function deleteListing(
  _: BunRequest<'/api/listings'>,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid trade ID');

  const deleted = removeListing(auth.userId, listingId);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
