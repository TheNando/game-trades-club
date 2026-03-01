import { BunRequest } from 'bun';
import { createTrade, removeTrade, listTradesByUser, updateTrade } from '../db/tradesTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type TradeBody = {
  title?: string;
  description?: string;
  platform?: string;
  status?: string;
};

function matchTradeId(url: URL) {
  return url.pathname.match(/^\/api\/trades\/([^/]+)$/)?.[1];
}

export async function getTrades(
  request: BunRequest<"/api/trades">,
  { auth, url }: RouteDependencies
) {
  return json({ items: listTradesByUser(auth.userId) });
}

export async function postTrade(
  request: BunRequest<"/api/trades">,
  { auth, url }: RouteDependencies
) {
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

export async function patchTrade(
  request: BunRequest<"/api/trades">,
  { auth, url }: RouteDependencies
) {
  const tradeId = matchTradeId(url);
  if (!tradeId) return badRequest('Invalid trade ID');

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

export async function deleteTrade(
  _: BunRequest<"/api/trades">,
  { auth, url }: RouteDependencies
) {
  const tradeId = matchTradeId(url);
  if (!tradeId) return badRequest('Invalid trade ID');

  const deleted = removeTrade(auth.userId, tradeId);
  return deleted ? new Response(null, { status: 204 }) : notFound();
}
