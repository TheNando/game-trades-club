# Game Trades Club — Project Context

Context for humans and LLMs working on the Game Trades Club codebase. It covers
what the product is, how the code is organized, the conventions to follow, the
data model, and the core domain vocabulary (ubiquitous language).

## Product

Game Trades Club is a local-first marketplace for buying, selling, and trading
board games between neighbors. Sellers post **Listings** for specific board
**Games** (enriched with data from BoardGameGeek), buyers browse and filter the
catalog, and the two sides arrange a handoff — typically at a local game
**Shop** that acts as a neutral pickup spot. Buyers and sellers coordinate
through in-app **Messaging**.

Current product direction is **marketplace-first**: a structured offer/trade
negotiation lifecycle is intentionally deferred. `listings.status`
(`open | pending | complete`) reserves room for it. See `TASKS.md` for the live
roadmap and `docs/` for design notes and plans.

## Tech Stack

- **Runtime / package manager**: Bun (`bun@1.3.14`). Pinned via `packageManager`.
- **Backend** (`apps/api`): Bun HTTP server (`Bun.serve`) + `bun:sqlite`
  (SQLite). Auth via Google OAuth with server-side sessions.
- **Frontend** (`apps/web`): Preact + `preact-iso` (routing) bundled with Vite.
  Styling with Tailwind CSS v4 + daisyUI. Maps via Leaflet.
- **Shared** (`packages/shared`, importable as `@game-trades-club/shared`):
  cross-cutting types, constants, formatters, validation, and utils used by both
  apps.
- **Testing**: `bun test` with `happy-dom` + `@testing-library/preact`. Test
  files are co-located next to source as `*.test.ts(x)`.

## Repo Layout

- `apps/web` — Preact/Vite client. `src/pages/*` are routed pages,
  `src/components/*` are shared UI. Routes are registered in `src/index.tsx`.
- `apps/api` — Bun API. `src/index.ts` wires routes to `Bun.serve`. Subfolders:
  `routes/` (HTTP handlers), `db/` (SQLite access + `schema.sql`), `auth/`
  (Google OAuth + sessions), `bgg/` (BoardGameGeek integration), `middleware/`,
  `storage/` (image files on disk), `utils/`.
- `packages/shared` — `@game-trades-club/shared`; barrel-exported from
  `src/index.ts`.
- `scripts` — one-off utilities. `load_games.ts` bulk-loads game ranks from the
  checked-in `scripts/boardgames_ranks.csv`; `refresh_game_ranks.ts` downloads a
  configured BoardGameGeek ranks CSV to `<DATA_PATH>/boardgames_ranks.csv` and
  loads it. `gameRanks.ts` contains shared parsing and path-resolution logic.
- `data` — default runtime data directory. `DATA_PATH` controls the location of
  the SQLite DB (`app.db`), uploaded listing images, fetched game images, and
  refreshed rank CSV. Dev data is disposable.
- `docs` — design notes and implementation plans.

## Key Commands

- `bun run dev` — run API + web together.
- `bun run server` — API only (`http://localhost:3000`).
- `bun run client` — Vite frontend (`http://localhost:5173`, proxies `/api/*`).
- `bun run build` — build the frontend bundle.
- `bun run games:load` — load the checked-in BoardGameGeek ranks snapshot.
- `bun run games:refresh` — download and load a configured ranks CSV snapshot.
- `bun run typecheck` — TypeScript checks for both apps.
- `bun run test` — full test suite (preloads `apps/web/test/setup.ts`).

## Architecture & Conventions

**API routing** — `apps/api/src/index.ts` maps paths to handlers in
`Bun.serve`'s `routes`. Handlers are wrapped with `withDeps`
(`middleware/dependencies.ts`), which injects `RouteDependencies`
(`{ auth, url }`). Routes default to **requiring authentication**; pass
`NO_AUTH` as the second argument to make a route public (auth is then a
fake/empty context).

**DB access (store pattern)** — Each table has a `db/<name>Table.ts` exposing a
`create<Name>Store(db)` factory that returns query/mutation functions. Routes
import these stores; tests inject a store backed by an in-memory test DB
(`src/test/createTestDatabase.ts`). The shared singleton connection is
`db/client.ts`.

**Schema** — `apps/api/src/db/schema.sql` is the single source of truth and is
run on startup. There is **no migration system yet**; `client.ts` only performs
minimal additive `ALTER TABLE ... ADD COLUMN` reconciliation for pre-existing
dev databases. Avoid destructive schema changes.

**Security model** —
- Sessions live in an HTTP-only cookie (`session_id`) backed by the `sessions`
  table; `requireAuth` resolves the cookie to an `AuthContext`.
- User-owned data is **always** filtered server-side with `user_id = ?`.
- APIs **never** accept `user_id` (or any owner id) from client payloads.
- Admin-only routes are gated by `middleware/requireAdmin.ts`. Admins are
  promoted only via direct SQL (`users.is_admin`).

**Shared types** — Prefer importing types/constants/formatters from
`@game-trades-club/shared` rather than redefining them. Enum-like values
(conditions, statuses) have constants + validation helpers there.

## Data Model

Primary entities (see `apps/api/src/db/schema.sql`):

- **users** — accounts (id, `google_sub`, email, name, avatar, `is_admin`).
- **sessions** — server-side login sessions (FK → users).
- **games** — board games (BGG `id`, name, image, publication year, players,
  playtime, `rating`, `adjusted_rating`, `weight`, `is_expansion`).
- **Game taxonomy** — `publishers`, `designers`, `artists`, `categories`,
  `mechanics`, joined to games via `game_*` many-to-many tables.
- **listings** — a user's offer to sell a game (FK → users, games, shops;
  `condition`, `price` in cents, `status`, `preferred_shop_id`).
- **listing_images** — uploaded images for a listing (files stored on disk via
  `storage/listingImageStorage.ts`; rows track ownership, original/stored names,
  MIME type, dimensions, and optional thumbnail names).
- **shops** — physical game stores used as pickup spots (name, city, state, ZIP,
  address, website, and latitude/longitude for map display).
- **conversations** / **messages** — see Messaging below.

## API Surface

Routes are registered in `apps/api/src/index.ts`. The current API includes:

- `GET /api/health`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/bgg/image`
- `GET /api/game-images/:id`
- `GET /api/games`
- `GET /api/listing-filters`
- `GET|POST /api/listings`
- `GET|PATCH|DELETE /api/listings/:id`
- `POST /api/listing-images`
- `GET /api/listing-images/:id` (supports the `thumb` variant)
- `GET|POST /api/shops`
- `PATCH|DELETE /api/shops/:id`
- `GET /api/users/:id`
- `GET|POST /api/conversations`
- `GET /api/conversations/unread-count`
- `GET /api/conversations/existing`
- `GET /api/conversations/:id`
- `POST /api/conversations/:id/messages`

## External Integrations

- **Google OAuth** (`auth/google.ts`, `auth/session.ts`) — sign-in. Configured
  via `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
  `SESSION_SECRET` (see `README.md` / `.env.example`).
- **BoardGameGeek (BGG) XML API** (`bgg/`) — fetches game credits, stats, and
  cover images. On listing creation, missing game info is synced on demand
  (`syncGameInfoIfMissing`); bulk ratings come from
  `scripts/boardgames_ranks.csv` and the `games:refresh` CSV workflow.

## Domain Vocabulary

The ubiquitous language for the project. Use these terms consistently in code,
APIs, and UI.

### Marketplace

**Listing**:
A single user's offer to sell one board Game, with a `condition`, a `price`
(stored as integer cents), a `status`, optional description/images, and an
optional preferred pickup Shop.
_Avoid_: post, ad, item.

**Game**:
A board game in the catalog, keyed by its BoardGameGeek id and enriched with BGG
metadata (image, publication year, players, playtime, rating, weight, expansion
status, and taxonomy). A Game is reference data shared across many Listings —
distinct from a Listing.

**Condition**:
The physical state of the copy being sold. Fixed enum:
`new | like_new | good | fair | poor` (see `@game-trades-club/shared`).

**Listing Status**:
Lifecycle of a Listing: `open | pending | complete`. Marketplace-first today;
reserved for a future trade lifecycle.

**Shop**:
A physical local game store used as a neutral pickup/meetup location, with a
geocoded position for the map. Managed by admins.
_Avoid_: store (in code identifiers), location.

**Seller / Buyer**:
A Seller owns a Listing; a Buyer is a user interested in it. These are roles in a
flow, not separate account types.

### Messaging

**Conversation**:
A persistent thread of messages between two participants. A conversation may optionally reference a single Listing.
_Avoid_: Thread, chat room

**Message**:
A single piece of text sent by a participant within a Conversation.

**Participant**:
A logged-in user who is part of a Conversation. In the current marketplace flow, this is typically a "Buyer" (sender of the initial message) and a "Seller" (recipient).

**Unread Conversation**:
A conversation that contains at least one message that a participant has not yet seen. Seen status is tracked via a "last read" timestamp per participant.

**Inbox**:
The collection of all conversations a user is participating in.
