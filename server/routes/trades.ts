import { requireAuth } from '../middleware/requireAuth';
import { createTrade, deleteTrade, listTradesByUser, updateTrade } from '../repos/tradesRepo';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type TradeBody = {
  title?: string;
  description?: string;
  platform?: string;
  status?: string;
};

export async function handleTradeRoutes(request: Request, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/trades')) return null;

  const auth = requireAuth(request);
  if (auth instanceof Response) return auth;

  if (request.method === 'GET' && url.pathname === '/api/trades') {
    return json({ items: listTradesByUser(auth.userId) });
  }

  if (request.method === 'POST' && url.pathname === '/api/trades') {
    const body = await readJson<TradeBody>(request);
    if (!body?.title) return badRequest('title is required');

    const trade = createTrade(auth.userId, {
      id: randomToken(18),
      title: body.title,
      description: body.description,
      platform: body.platform,
      status: body.status,
    });

    return json({ item: trade }, { status: 201 });
  }

  const idMatch = url.pathname.match(/^\/api\/trades\/([^/]+)$/);
  const tradeId = idMatch?.[1];
  if (!tradeId) return null;

  if (request.method === 'PATCH') {
    const body = await readJson<TradeBody>(request);
    if (!body) return badRequest('Invalid JSON body');

    const updated = updateTrade(auth.userId, tradeId, {
      title: body.title,
      description: body.description,
      platform: body.platform,
      status: body.status,
    });

    return updated ? new Response(null, { status: 204 }) : notFound();
  }

  if (request.method === 'DELETE') {
    const deleted = deleteTrade(auth.userId, tradeId);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  }

  return null;
}
