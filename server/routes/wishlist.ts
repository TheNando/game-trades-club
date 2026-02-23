import { requireAuth } from '../middleware/requireAuth';
import { createWishlistItem, deleteWishlistItem, listWishlistByUser, updateWishlistItem } from '../repos/wishlistRepo';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type WishlistBody = {
  gameTitle?: string;
  platform?: string;
  notes?: string;
};

export async function handleWishlistRoutes(request: Request, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/wishlist')) return null;

  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET' && url.pathname === '/api/wishlist') {
    return json({ items: listWishlistByUser(auth.userId) });
  }

  if (request.method === 'POST' && url.pathname === '/api/wishlist') {
    const body = await readJson<WishlistBody>(request);
    if (!body?.gameTitle) return badRequest('gameTitle is required');

    const item = createWishlistItem(auth.userId, {
      id: randomToken(18),
      gameTitle: body.gameTitle,
      platform: body.platform,
      notes: body.notes,
    });

    return json({ item }, { status: 201 });
  }

  const idMatch = url.pathname.match(/^\/api\/wishlist\/([^/]+)$/);
  const itemId = idMatch?.[1];
  if (!itemId) return null;

  if (request.method === 'PATCH') {
    const body = await readJson<WishlistBody>(request);
    if (!body) return badRequest('Invalid JSON body');

    const updated = updateWishlistItem(auth.userId, itemId, {
      gameTitle: body.gameTitle,
      platform: body.platform,
      notes: body.notes,
    });

    return updated ? new Response(null, { status: 204 }) : notFound();
  }

  if (request.method === 'DELETE') {
    const deleted = deleteWishlistItem(auth.userId, itemId);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  }

  return null;
}
