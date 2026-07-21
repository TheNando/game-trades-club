# Game Trades Club — Task List

A living checklist of features, fixes, and improvements. Check items off as they ship.

## Project hygiene

- [x] Fix project hygiene first. Add the missing build script in `package.json`, update stale README endpoints in `README.md`, and fix TypeScript coverage so the new app layout is typechecked intentionally.
- [x] Clean up stale trade/offers/wishlist direction. Direction picked: **listings marketplace first**. Dead route/schema/table stubs removed from `apps/api/src/index.ts`, `apps/api/src/db/schema.sql`, and `apps/api/src/{routes,db}/`. Future trade/offer/wishlist work is tracked under "Trades workflow" below.
- [x] Enforce typecheck and tests in CI (`bun run typecheck`, `bun run test`).
- [ ] Reintroduce a schema migration system once there's a live database worth preserving (deferred until v1; `schema.sql` is currently the single source of truth and dev DBs are disposable).
- [ ] Document and automate backups for the `DATA_PATH` directory.

## Core marketplace gaps

- [x] Add an Admin page where admins can add game stores. Admins may only be added via direct SQL statement.
- [x] Admin: edit and delete game stores from the admin page.
- [x] Listing detail page (`/listings/:id`). Cards on `/games` currently dead-end; users can't see full description, all images, or the seller.
- [x] Owner controls on `/listings/:id` (edit description / price / condition, delete) when the viewer owns the listing. Add a "Profile" link to the signed-in user menu so users can find their own listings via the existing user profile page. Status transitions are intentionally excluded for now — they'll be driven by the future offer flow.
- [x] Public user profile pages (member since, current listings, trade history).
- [x] Messaging / contact flow between buyer and seller. The landing page promises "message the owner"; nothing implements it.
- [x] Search bar on `/games`.
- [x] Filters on `/games`: condition, price range, category, mechanic, player count, year.
- [x] Close the game-stats data gaps. Coverage is handled by the existing listing-creation BGG sync when `rating`/`adjusted_rating` are missing, while normal browsing/filtering still avoids BGG XML calls. Staleness is handled by `bun run games:refresh`, which downloads a configured ranks CSV snapshot and reruns the bulk loader.
- [ ] Sort options on `/games` (newest, price asc/desc).
- [ ] Add `city` / location to `users` and scope listings by city — the core "neighbors in your city" pitch.
- [x] Pickup-shop directory (`shops` table) and shop picker on each listing; map view.
- [ ] Serve and display uploaded listing images end-to-end. Verify image lookup/list and file-serving cover all UI needs from `apps/api/src/db/listingImagesTable.ts`, `apps/api/src/routes/listingImages.ts`, and `apps/api/src/storage/listingImageStorage.ts`.

## Trades workflow

- [x] Decide product direction: pure marketplace vs. structured trade negotiation. **Decided: pure marketplace first.** `listings.status` (`open|pending|complete`) keeps room for a future trade lifecycle without forcing the design now.
- [ ] If keeping trades/offers: build offer → accept → meetup → complete state machine wired to `listings.status` (`open|pending|complete`).
- [ ] Shop agreement workflow: buyer accepts the seller's preferred shop or proposes a different one; both must agree before completing.
- [ ] Wishlist: signed-in users mark games they want.
- [ ] "A game on your wishlist was just listed" notifications.

## Validation & safety

- [ ] Harden listing/image validation. Runtime-validate `condition` and `status` enums in `apps/api/src/routes/listings.ts`, cap image count per listing on the server, and add a FK on `listings.game_id` in `apps/api/src/db/schema.sql`.
- [ ] Pagination on `GET /api/listings`.
- [ ] Rate limiting on auth, uploads, and listing creation.
- [ ] EXIF strip on uploaded images (privacy).
- [ ] Client-side image compression and upload progress UI.
- [ ] Report / block a user.
- [ ] Trust signals on profiles: member since, completed-trade count, ratings.
- [ ] Email verification and transactional email (welcome, new message, trade confirmation).

## Frontend polish

- [ ] Centralize auth state in the frontend. `Header`, `AddListing`, and `ListingDetail` each fetch `/api/me` separately in `apps/web/src` and keep their own copy of the user. A shared auth hook or context would simplify logout/login behavior and reduce duplicated loading and error states.
- [ ] Loading skeletons on `/games` instead of "Loading listings…" text.
- [ ] Empty/error states with retry on the listings fetch.
- [ ] Mobile nav (hamburger). Current nav is `hidden md:flex` with no small-screen replacement.
- [ ] 404 page styling consistency check.
- [ ] SEO / OG tags / sitemap once listing detail pages exist.
