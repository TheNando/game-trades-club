import { NO_AUTH, withDeps } from './middleware/dependencies';
import { getAuthGoogleCallback, getAuthGoogleStart, getMe, postAuthLogout } from './routes/auth';
import { getBggImage } from './routes/bgg';
import { getGameImage } from './routes/gameImages';
import { getGames } from './routes/games';
import { getListingFilters } from './routes/listingFilters';
import { getListingImage, postListingImage } from './routes/listingImages';
import {
  deleteListing,
  getListingDetail,
  getListings,
  patchListing,
  postListing,
} from './routes/listings';
import { deleteShop, getShops, patchShop, postShop } from './routes/shops';
import { getUserProfile } from './routes/users';
import {
  getConversations,
  getConversationDetail,
  postConversation,
  postMessage,
  getUnreadCount,
  getExistingConversations,
} from './routes/conversations';
import { json } from './utils/http';

const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  routes: {
    '/api/auth/google/callback': {
      GET: withDeps(getAuthGoogleCallback, NO_AUTH),
    },
    '/api/auth/google/start': {
      GET: withDeps(getAuthGoogleStart, NO_AUTH),
    },
    '/api/auth/logout': {
      POST: withDeps(postAuthLogout),
    },
    '/api/conversations': {
      GET: withDeps(getConversations),
      POST: withDeps(postConversation),
    },
    '/api/conversations/unread-count': {
      GET: withDeps(getUnreadCount),
    },
    '/api/conversations/existing': {
      GET: withDeps(getExistingConversations),
    },
    '/api/conversations/:id': {
      GET: withDeps(getConversationDetail),
    },
    '/api/conversations/:id/messages': {
      POST: withDeps(postMessage),
    },
    '/api/bgg/image': {
      GET: withDeps(getBggImage),
    },
    '/api/health': {
      GET: json({ ok: true }),
    },
    '/api/game-images/:id': {
      GET: withDeps(getGameImage, NO_AUTH),
    },
    '/api/games': {
      GET: withDeps(getGames, NO_AUTH),
    },
    '/api/me': {
      GET: withDeps(getMe),
    },
    '/api/listing-filters': {
      GET: withDeps(getListingFilters, NO_AUTH),
    },
    '/api/listings': {
      GET: withDeps(getListings, NO_AUTH),
      POST: withDeps(postListing),
    },
    '/api/listings/:id': {
      DELETE: withDeps(deleteListing),
      GET: withDeps(getListingDetail, NO_AUTH),
      PATCH: withDeps(patchListing),
    },
    '/api/listing-images': {
      POST: withDeps(postListingImage),
    },
    '/api/listing-images/:id': {
      GET: withDeps(getListingImage, NO_AUTH),
    },
    '/api/shops': {
      GET: withDeps(getShops, NO_AUTH),
      POST: withDeps(postShop),
    },
    '/api/shops/:id': {
      DELETE: withDeps(deleteShop),
      PATCH: withDeps(patchShop),
    },
    '/api/users/:id': {
      GET: withDeps(getUserProfile, NO_AUTH),
    },
  },
  fetch() {
    return json({ error: 'Not found' }, { status: 404 });
  },
});

console.log(`API server listening on http://localhost:${port}`);
