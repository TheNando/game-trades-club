import { BunRequest } from 'bun';
// import { createWishlistItem, deleteWishlistItem, listWishlistByUser, updateWishlistItem } from '../db/wishlistTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type WishlistBody = {
  gameTitle?: string;
  platform?: string;
  notes?: string;
};

function matchWishlistId(url: URL) {
  return url.pathname.match(/^\/api\/wishlist\/([^/]+)$/)?.[1];
}

// export async function getWishlist(
//   _: BunRequest<"/api/wishlist">,
//   { auth }: RouteDependencies
// ) {
//   return json({ items: listWishlistByUser(auth.userId) });
// }

// export async function postWishlist(
//   request: BunRequest<"/api/wishlist">,
//   { auth }: RouteDependencies
// ) {
//   const body = await readJson<WishlistBody>(request);
//   if (!body?.gameTitle) return badRequest('gameTitle is required');

//   const item = createWishlistItem(auth.userId, {
//     id: randomToken(18),
//     gameTitle: body.gameTitle,
//     platform: body.platform,
//     notes: body.notes,
//   });

//   return json({ item }, { status: 201 });
// }

// export async function patchWishlist(
//   request: BunRequest<"/api/wishlist">,
//   { auth, url }: RouteDependencies
// ) {
//   const listId = matchWishlistId(url);

//   if (!listId) return badRequest('Invalid wishlist ID');

//   const body = await readJson<WishlistBody>(request);
//   if (!body) return badRequest('Invalid JSON body');

//   const updated = updateWishlistItem(auth.userId, listId, {
//     gameTitle: body.gameTitle,
//     platform: body.platform,
//     notes: body.notes,
//   });

//   return updated ? new Response(null, { status: 204 }) : notFound();
// }

// export async function deleteWishlist(
//   _: BunRequest<"/api/wishlist">,
//   { auth, url }: RouteDependencies
// ) {
//   const listId = matchWishlistId(url);

//   if (!listId) return badRequest('Invalid wishlist ID');

//   const deleted = deleteWishlistItem(auth.userId, listId);
//   return deleted ? new Response(null, { status: 204 }) : notFound();
// }
