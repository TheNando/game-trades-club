- [x] Fix project hygiene first. Add the missing build script in `package.json`, update stale README endpoints in `README.md`, and fix TypeScript coverage so the new app layout is typechecked intentionally.

- [ ] Add a listings browse experience. The home page links to `/games`, but only `/` and `/add-listing` are routed in `apps/web/src/index.tsx`. Backend `GET /api/listings` currently returns only the signed-in user’s listings via `WHERE user_id = ?` in `apps/api/src/db/listingsTable.ts`, so a public marketplace browse API/page is the biggest product unlock.

- [ ] Serve and display uploaded listing images. Upload metadata/files exist, but there’s no image lookup/list API or file-serving route yet. Start from `apps/api/src/db/listingImagesTable.ts`, `apps/api/src/routes/listingImages.ts`, and `apps/api/src/storage/listingImageStorage.ts`.

- [ ] Harden listing/image validation. The client limits images to 3, but the server accepts unlimited repeated one-file uploads for a listing. Also `condition` and `status` are typed but not runtime-validated in `apps/api/src/routes/listings.ts`, and `listings.game_id` has no FK in `apps/api/src/db/schema.sql`.

- [ ] Clean up stale trade/offers/wishlist direction. The commented route/schema code is still present in `apps/api/src/index.ts` and `apps/api/src/db/schema.sql`. Decide whether the product is “listings marketplace” first or “trades/offers/wishlist,” then remove or revive the dead code accordingly.

- [ ] Centralize auth state in the frontend. Both `Header` and `AddListing` fetch `/api/me` separately in `apps/web/src`. A shared auth hook or context would simplify logout/login behavior and reduce duplicated loading and error states.
