# Game Trades Club

Preact frontend with a Bun API backend using Bun SQLite and Google OAuth.

## App Commands

- `bun run dev` starts the Vite frontend (`http://localhost:5173`)
- `bun run server` starts the Bun API (`http://localhost:3000`)
- `bun run build` builds the frontend bundle

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
- `GET|POST /api/trades`
- `PATCH|DELETE /api/trades/:id`
- `GET|POST /api/offers`
- `PATCH|DELETE /api/offers/:id`
- `GET|POST /api/wishlist`
- `PATCH|DELETE /api/wishlist/:id`
