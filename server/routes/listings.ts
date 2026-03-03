import { BunRequest } from 'bun';
import { createListing, removeListing, listListingsByUser, updateListing } from '../db/listingsTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type ListingBody = {
  title: string;
  description: string;
  game_id: string;
  condition: string;
  status: string;
};

function matchListingId(url: URL) {
  return url.pathname.match(/^\/api\/listings\/([^/]+)$/)?.[1];
}

export async function getListings(
  request: BunRequest<"/api/listings">,
  { auth, url }: RouteDependencies
) {
  return json({ items: listListingsByUser(auth.userId) });
}

export async function postListing(
  request: BunRequest<"/api/listings">,
  { auth, url }: RouteDependencies
) {
  const body = await readJson<ListingBody>(request);
  if (!body?.title) return badRequest('title is required');

  const listing = createListing(auth.userId, {
    id: randomToken(18),
    title: body.title,
    description: body.description,
    game_id: parseInt(body.game_id, 10),
    condition: body.condition,
    status: body.status,
  });

  return json({ item: listing }, { status: 201 });
}

export async function patchListing(
  request: BunRequest<"/api/listings">,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid listing ID');

  const body = await readJson<ListingBody>(request);
  if (!body) return badRequest('Invalid JSON body');

  const updated = updateListing(auth.userId, listingId, {
    title: body.title,
    description: body.description,
    game_id: parseInt(body.game_id, 10),
    condition: body.condition,
    status: body.status,
  });

  return updated ? new Response(null, { status: 204 }) : notFound();
}

export async function deleteListing(
  _: BunRequest<"/api/listings">,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid trade ID');

  const deleted = removeListing(auth.userId, listingId);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
