# User System Design (Google OAuth + Bun SQLite)

Date: 2026-02-23

## Goal

Implement a user system in Bun using SQLite with strict per-user data isolation so users can only manipulate their own data.

## Chosen Approach

Option 1: Bun API + Google OAuth + SQLite with row ownership checks.

- OAuth provider: Google (first provider)
- Data ownership in v1: trades, offers, wishlist
- Isolation model: shared tables with `user_id` and strict server-side filtering

## Architecture

- Bun server in `src/server` exposes auth and protected CRUD API routes.
- Preact frontend calls the API and never controls server trust boundaries.
- Google OAuth flow:
  - `GET /api/auth/google/start`
  - `GET /api/auth/google/callback`
  - `POST /api/auth/logout`
- Session strategy:
  - Opaque `session_id` in secure HTTP-only cookie
  - Session metadata stored in SQLite (`sessions` table)

## Components

- `src/server/index.ts`: Bun entrypoint, router, JSON helpers
- `src/server/auth/google.ts`: OAuth start/callback and profile mapping
- `src/server/auth/session.ts`: session create/read/revoke + cookie helpers
- `src/server/db/schema.sql`: schema and indexes
- `src/server/db/client.ts`: DB singleton and schema bootstrap
- `src/server/repos/tradesRepo.ts`
- `src/server/repos/offersRepo.ts`
- `src/server/repos/wishlistRepo.ts`
- `src/server/middleware/requireAuth.ts`
- `src/server/routes/auth.ts`
- `src/server/routes/trades.ts`
- `src/server/routes/offers.ts`
- `src/server/routes/wishlist.ts`

## Data Flow

1. User clicks sign-in and navigates to `/api/auth/google/start`.
2. Server sets short-lived OAuth state cookie and redirects to Google.
3. Callback validates state, exchanges code, fetches Google profile, upserts user.
4. Server creates session row and sets HTTP-only session cookie.
5. Protected routes resolve `currentUser` from session cookie.
6. Repositories receive `userId` from middleware only.
7. Every SQL read/write filters with `user_id = ?`.
8. Cross-user access attempts return `404`.

## Error Handling

- Invalid OAuth state/token/profile: `401`
- Missing/expired/revoked session: `401`
- Validation errors: `400`
- Accessing non-owned resources: `404`
- Unexpected failures: `500` with structured logs

## Testing Plan

- Unit tests for cookie/session helpers and ownership-scoped repo methods
- Integration tests for auth flow boundaries and protected CRUD
- Negative tests to verify user A cannot read/update/delete user B resources

## Security Rules

- Never accept `user_id` from client payloads.
- Ownership checks are enforced in SQL predicates, not UI.
- Session IDs are random opaque tokens and can be revoked server-side.
- Use `SameSite=Lax`, `HttpOnly`, `Secure` in production.

## Environment

Required variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `SESSION_SECRET`

Optional variables:

- `DATA_PATH` (default `./data`; contains the SQLite database and application
  generated files)

## Notes

The `writing-plans` skill referenced by brainstorming is not available in this session’s skill list, so implementation proceeds directly from this approved design.
