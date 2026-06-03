import { NO_AUTH, withDeps } from './middleware/dependencies';
import { getAuthGoogleCallback, getAuthGoogleStart, getMe, postAuthLogout } from './routes/auth';
import { getBggImage } from './routes/bgg';
import { getGames } from './routes/games';
import { getListingImage, postListingImage } from './routes/listingImages';
import { deleteListing, getListings, patchListing, postListing } from './routes/listings';
// import { deleteOffer, getOffers, patchOffer, postOffer } from './routes/offers';
// import { deleteTrade, getTrades, patchTrade, postTrade } from './routes/trades';
// import { deleteWishlist, getWishlist, patchWishlist, postWishlist } from './routes/wishlist';
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
    "/api/listing-images": {
      POST: withDeps(postListingImage),
    },
    "/api/listing-images/:id": {
      GET: withDeps(getListingImage, NO_AUTH),
    },
    // "/api/offers": {
    //   DELETE: withDeps(deleteOffer),
    //   GET: withDeps(getOffers),
    //   PATCH: withDeps(patchOffer),
    //   POST: withDeps(postOffer),
    // },
    // "/api/trades": {
    //   DELETE: withDeps(deleteTrade),
    //   GET: withDeps(getTrades),
    //   PATCH: withDeps(patchTrade),
    //   POST: withDeps(postTrade),
    // },
    // "/api/wishlist": {
    //   DELETE: withDeps(deleteWishlist),
    //   GET: withDeps(getWishlist),
    //   PATCH: withDeps(patchWishlist),
    //   POST: withDeps(postWishlist),
    // },
  },
  fetch() {
    return json({ error: 'Not found' }, { status: 404 });
  }
});

console.log(`API server listening on http://localhost:${port}`);
