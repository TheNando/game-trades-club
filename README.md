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
- `bun run typecheck` runs TypeScript checks for both apps
- `bun run test` runs the test suite

Vite is configured to proxy `/api/*` requests to `http://localhost:3000` during local development.

## Environment

Copy `.env.example` to `.env` and set:

- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (set `http://localhost:5173/api/auth/google/callback` for Vite dev)
- `DATABASE_PATH` (optional)
- `PORT` (optional)

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
