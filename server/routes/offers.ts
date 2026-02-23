import { requireAuth } from '../middleware/requireAuth';
import { createOffer, deleteOffer, listOffersByUser, updateOffer } from '../repos/offersRepo';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type OfferBody = {
  tradeId?: string;
  message?: string;
  priceCents?: number;
};

export async function handleOfferRoutes(request: Request, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/offers')) return null;

  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET' && url.pathname === '/api/offers') {
    return json({ items: listOffersByUser(auth.userId) });
  }

  if (request.method === 'POST' && url.pathname === '/api/offers') {
    const body = await readJson<OfferBody>(request);
    if (!body) return badRequest('Invalid JSON body');

    const offer = createOffer(auth.userId, {
      id: randomToken(18),
      tradeId: body.tradeId,
      message: body.message,
      priceCents: body.priceCents,
    });

    if (!offer) return notFound();
    return json({ item: offer }, { status: 201 });
  }

  const idMatch = url.pathname.match(/^\/api\/offers\/([^/]+)$/);
  const offerId = idMatch?.[1];
  if (!offerId) return null;

  if (request.method === 'PATCH') {
    const body = await readJson<OfferBody>(request);
    if (!body) return badRequest('Invalid JSON body');

    const updated = updateOffer(auth.userId, offerId, {
      tradeId: body.tradeId,
      message: body.message,
      priceCents: body.priceCents,
    });

    return updated ? new Response(null, { status: 204 }) : notFound();
  }

  if (request.method === 'DELETE') {
    const deleted = deleteOffer(auth.userId, offerId);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  }

  return null;
}
