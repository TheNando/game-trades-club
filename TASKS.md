# Game Trades Club — Task List

A living checklist of features, fixes, and improvements. Check items off as they ship.

## Project hygiene

- [x] [Hygiene.build] Fix project hygiene first. Add the missing build script in `package.json`, update stale README endpoints in `README.md`, and fix TypeScript coverage so the new app layout is typechecked intentionally.
- [x] [Hygiene.direction] Clean up stale trade/offers/wishlist direction. Direction picked: **listings marketplace first**. Dead route/schema/table stubs removed from `apps/api/src/index.ts`, `apps/api/src/db/schema.sql`, and `apps/api/src/{routes,db}/`. Future trade/offer/wishlist work is tracked under "Trades workflow" below.
- [x] [Hygiene.ci] Enforce typecheck and tests in CI (`bun run typecheck`, `bun run test`).
- [ ] [API.persistence] Introduce versioned database migrations before preserving a live database or making non-additive schema changes. Replace startup-only additive reconciliation in `apps/api/src/db/client.ts`; migrations must support constraints, indexes, data backfills, and compatibility with existing development databases.
- [ ] [Hygiene.backups] Document and automate backups for the `DATA_PATH` directory.

## Core marketplace gaps

- [x] [Marketplace.admin-shops] Add an Admin page where admins can add game stores. Admins may only be added via direct SQL statement.
- [x] [Marketplace.manage-shops] Admin: edit and delete game stores from the admin page.
- [x] [Marketplace.listing-detail] Listing detail page (`/listings/:id`). Cards on `/games` currently dead-end; users can't see full description, all images, or the seller.
- [x] [Marketplace.owner-controls] Owner controls on `/listings/:id` (edit description / price / condition, delete) when the viewer owns the listing. Add a "Profile" link to the signed-in user menu so users can find their own listings via the existing user profile page. Status transitions are intentionally excluded for now — they'll be driven by the future offer flow.
- [x] [Marketplace.user-profiles] Public user profile pages (member since, current listings, trade history).
- [x] [Marketplace.messaging] Messaging / contact flow between buyer and seller. The landing page promises "message the owner"; nothing implements it.
- [x] [Marketplace.search] Search bar on `/games`.
- [x] [Marketplace.filters] Filters on `/games`: condition, price range, category, mechanic, player count, year.
- [x] [Marketplace.game-stats] Close the game-stats data gaps. Coverage is handled by the existing listing-creation BGG sync when `rating`/`adjusted_rating` are missing, while normal browsing/filtering still avoids BGG XML calls. Staleness is handled by `bun run games:refresh`, which downloads a configured ranks CSV snapshot and reruns the bulk loader.
- [ ] [Marketplace.sorting] Sort options on `/games` (newest, price asc/desc).
- [ ] [Marketplace.city-scope] Add `city` / location to `users` and scope listings by city — the core "neighbors in your city" pitch.
- [x] [Marketplace.pickup-shops] Pickup-shop directory (`shops` table) and shop picker on each listing; map view.
- [ ] [Marketplace.listing-images] Serve and display uploaded listing images end-to-end. Verify image lookup/list and file-serving cover all UI needs from `apps/api/src/db/listingImagesTable.ts`, `apps/api/src/routes/listingImages.ts`, and `apps/api/src/storage/listingImageStorage.ts`.

## API maintainability

- [x] [API.validation] Add and use Zod for shared runtime schemas covering listings, shops, messages, upload metadata, and query parameters. Validate listing `condition` and `status` on both POST and PATCH; reject malformed or unknown values; normalize nullable fields; and enforce text-length, numeric-range, and server-side image-count limits. Infer shared TypeScript request types from the schemas and add malformed/out-of-range request coverage.
- [ ] [API.persistence] Add database `CHECK` constraints for listing conditions, statuses, and non-negative prices. Apply these through the migration system so invalid state cannot be written by alternate clients or future routes.
- [ ] [API.messaging] Make conversation creation and first-message insertion atomic. Prevent duplicate listing conversations under concurrent requests using canonical participant ordering plus a unique constraint on the participant pair and `listing_id`; update conversation timestamps and read state in the same transaction.
- [ ] [API.storage] Harden image storage boundaries: enforce upload and remote-download byte limits, validate actual image content rather than MIME type or filename extension alone, return controlled errors for all storage failures, and remove original and thumbnail files when a listing is deleted.
- [ ] [API.config] Centralize and validate server configuration at startup with Zod. Require `SESSION_SECRET` in production, define an explicit trusted-proxy policy before using forwarded headers, and consolidate cookie and OAuth security settings.
- [ ] [API.architecture] Add an API composition root that constructs database stores, auth/session services, logger, BGG client, and image storage dependencies. Reduce direct imports of the singleton database from routes, authentication, and stores to improve testability and make production wiring explicit.
- [ ] [API.domain] Extract multi-step domain workflows from route handlers into focused application services. Start with listing creation/deletion and conversation creation/message sending; routes should retain HTTP parsing, authorization, and response formatting.
- [ ] [API.scalability] Add bounded cursor pagination to listing, inbox, message, and shop collection endpoints. Add supporting composite indexes and inspect the listing and inbox SQL with `EXPLAIN QUERY PLAN` as data volume grows.
- [ ] [API.integration] Move BoardGameGeek enrichment and image downloads off the listing-creation request path. Add external request timeouts, bounded response sizes, retry behavior, and observable enrichment failures/status.
- [ ] [API.operations] Add centralized exception mapping, structured logging, request IDs, and rate limiting for authentication, uploads, BGG proxying, listing creation, and messaging.
- [ ] [API.testing] Add integration coverage for route registration, authentication/session expiry and revocation, migration compatibility, malformed and oversized uploads, successful thumbnail generation, storage cleanup, proxy-header handling, transaction rollback, and concurrent conversation creation.

## Trades workflow

- [x] [Trades.direction] Decide product direction: pure marketplace vs. structured trade negotiation. **Decided: pure marketplace first.** `listings.status` (`open|pending|complete`) keeps room for a future trade lifecycle without forcing the design now.
- [ ] [Trades.offer-lifecycle] If keeping trades/offers: build offer → accept → meetup → complete state machine wired to `listings.status` (`open|pending|complete`).
- [ ] [Trades.shop-agreement] Shop agreement workflow: buyer accepts the seller's preferred shop or proposes a different one; both must agree before completing.
- [ ] [Trades.wishlist] Wishlist: signed-in users mark games they want.
- [ ] [Trades.wishlist-notifications] "A game on your wishlist was just listed" notifications.

## Validation & safety

- [ ] [Safety.listing-game-foreign-key] The listing `game_id` foreign key is already present in `apps/api/src/db/schema.sql`; retain it in all future migrations.
- [ ] [Safety.image-exif] EXIF strip on uploaded images (privacy).
- [ ] [Safety.image-upload-ux] Client-side image compression and upload progress UI.
- [ ] [Safety.user-reporting] Report / block a user.
- [ ] [Safety.trust-signals] Trust signals on profiles: member since, completed-trade count, ratings.
- [ ] [Safety.email] Email verification and transactional email (welcome, new message, trade confirmation).

## Frontend polish

- [ ] [Frontend.auth-state] Centralize auth state in the frontend. `Header`, `AddListing`, and `ListingDetail` each fetch `/api/me` separately in `apps/web/src` and keep their own copy of the user. A shared auth hook or context would simplify logout/login behavior and reduce duplicated loading and error states.
- [ ] [Frontend.loading-skeletons] Loading skeletons on `/games` instead of "Loading listings…" text.
- [ ] [Frontend.listings-states] Empty/error states with retry on the listings fetch.
- [ ] [Frontend.mobile-nav] Mobile nav (hamburger). Current nav is `hidden md:flex` with no small-screen replacement.
- [ ] [Frontend.not-found] 404 page styling consistency check.
- [ ] [Frontend.seo] SEO / OG tags / sitemap once listing detail pages exist.
