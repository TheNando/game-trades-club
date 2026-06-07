import { NO_AUTH, withDeps } from './middleware/dependencies';
import { getAuthGoogleCallback, getAuthGoogleStart, getMe, postAuthLogout } from './routes/auth';
import { getBggImage } from './routes/bgg';
import { getGames } from './routes/games';
import { getListingImage, postListingImage } from './routes/listingImages';
import { deleteListing, getListingDetail, getListings, patchListing, postListing } from './routes/listings';
import { getShops, postShop } from './routes/shops';
import { getUserProfile } from './routes/users';
import { json } from './utils/http';

const port = Number(process.env.PORT ?? 3000);

Bun.serve({
  port,
  routes: {
    "/api/auth/google/callback": {
      GET: withDeps(getAuthGoogleCallback, NO_AUTH)
    },
    "/api/auth/google/start": {
      GET: withDeps(getAuthGoogleStart, NO_AUTH)
    },
    "/api/auth/logout": {
      POST: withDeps(postAuthLogout)
    },
    "/api/bgg/image": {
      GET: withDeps(getBggImage)
    },
    "/api/health": {
      GET: json({ ok: true })
    },
    "/api/games": {
      GET: withDeps(getGames, NO_AUTH)
    },
    "/api/me": {
      GET: withDeps(getMe)
    },
    "/api/listings": {
      DELETE: withDeps(deleteListing),
      GET: withDeps(getListings, NO_AUTH),
      PATCH: withDeps(patchListing),
      POST: withDeps(postListing),
    },
    "/api/listings/:id": {
      GET: withDeps(getListingDetail, NO_AUTH),
    },
    "/api/listing-images": {
      POST: withDeps(postListingImage),
    },
    "/api/listing-images/:id": {
      GET: withDeps(getListingImage, NO_AUTH),
    },
    "/api/shops": {
      GET: withDeps(getShops, NO_AUTH),
      POST: withDeps(postShop),
    },
    "/api/users/:id": {
      GET: withDeps(getUserProfile, NO_AUTH),
    },
  },
  fetch() {
    return json({ error: 'Not found' }, { status: 404 });
  }
});

console.log(`API server listening on http://localhost:${port}`);
