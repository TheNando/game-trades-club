import { handleAuthRoutes } from './routes/auth';
import { handleOfferRoutes } from './routes/offers';
import { handleTradeRoutes } from './routes/trades';
import { handleWishlistRoutes } from './routes/wishlist';
import { json, serverError } from './utils/http';

const port = Number(process.env.PORT ?? 3000);

const handlers = [handleAuthRoutes, handleTradeRoutes, handleOfferRoutes, handleWishlistRoutes] as const;

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    try {
      for (const handler of handlers) {
        const response = await handler(request, url);
        if (response) return response;
      }

      if (url.pathname === '/api/health') {
        return json({ ok: true });
      }

      return json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
      console.error('Unhandled server error', error);
      return serverError();
    }
  },
});

console.log(`API server listening on http://localhost:${port}`);
