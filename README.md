# Game Trades Club

Preact frontend with a Bun API backend using Bun SQLite and Google OAuth.

## Repo Layout

- `apps/web` contains the Preact/Vite client
- `apps/api` contains the Bun API and SQLite access layer
- `scripts` contains one-off utilities like game imports
- `docs` contains design notes and implementation plans

## App Commands

- `bun run dev` starts both the web app and API
- `bun run client` starts the Vite frontend (`http://localhost:5173`)
- `bun run server` starts the Bun API (`http://localhost:3000`)
- `bun run build` builds the frontend bundle
- `bun run games:load` bulk-loads games from the checked-in BGG ranks snapshot
- `bun run games:refresh` downloads the configured BGG ranks CSV and bulk-loads it
- `bun run typecheck` runs TypeScript checks for both apps
- `bun run test` runs the test suite
- `bun run lint` checks TypeScript, TSX, and exported declaration documentation
- `bun run format:check` checks formatting; `bun run format` applies it

Vite is configured to proxy `/api/*` requests to `http://localhost:3000` during local development.

## Development Conventions

- Keep modules organized by imports, local types, constants, private helpers, and public operations.
- Prefer semantic grouping over blanket alphabetization, and export declarations near their definitions when clear.
- Document every exported source declaration with concise TSDoc. Add `@param` only for non-obvious constraints, units, or meanings.
- Preserve API, database, authentication, and ownership contracts when refactoring.

## Environment

Copy `.env.example` to `.env` and set:

- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (set `http://localhost:5173/api/auth/google/callback` for Vite dev)
- `DATA_PATH` (optional, defaults to `./data`; contains the SQLite database,
  uploaded listing images, fetched game images, and refreshed rank CSV)
- `PORT` (optional)
- `BOARDGAMES_RANKS_CSV_URL` (required for `bun run games:refresh`)

## Game Data Refresh

Game ratings are seeded from `scripts/boardgames_ranks.csv`. For production
freshness, configure `BOARDGAMES_RANKS_CSV_URL` with the current BoardGameGeek
ranks CSV export URL and run `bun run games:refresh` from a weekly cron or
scheduled job. The refresh downloads one CSV file to
`<DATA_PATH>/boardgames_ranks.csv`
and reruns the bulk loader; it does not call the BGG XML API per game.

Use `bun run games:load` to reload the checked-in snapshot. Both commands accept
`--csv <path>` for an explicit one-off CSV path override.

## Security Model

- Session is stored in an HTTP-only cookie (`session_id`)
- Session records are stored in SQLite (`sessions` table)
- User-owned data is always filtered server-side with `user_id = ?`
- APIs never accept `user_id` from client payloads

## API Endpoints

- `GET /api/health`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/bgg/image`
- `GET /api/games`
- `GET|POST /api/listings`
- `PATCH|DELETE /api/listings/:id`
- `POST /api/listing-images`
- `GET /api/users/:id`
