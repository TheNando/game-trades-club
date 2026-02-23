import { db } from '../db/client';

export type UserRecord = {
  id: string;
  google_sub: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};

type GoogleProfile = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

const selectByGoogleSubStmt = db.query<UserRecord, [string]>(
  `SELECT id, google_sub, email, name, avatar_url FROM users WHERE google_sub = ?`
);

const upsertStmt = db.query(
  `INSERT INTO users (id, google_sub, email, name, avatar_url)
   VALUES (?, ?, ?, ?, ?)
   ON CONFLICT(google_sub)
   DO UPDATE SET
     email = excluded.email,
     name = excluded.name,
     avatar_url = excluded.avatar_url,
     updated_at = CURRENT_TIMESTAMP`
);

const selectByIdStmt = db.query<UserRecord, [string]>(
  `SELECT id, google_sub, email, name, avatar_url FROM users WHERE id = ?`
);

export function upsertGoogleUser(id: string, profile: GoogleProfile): UserRecord {
  upsertStmt.run(id, profile.sub, profile.email, profile.name ?? null, profile.picture ?? null);
  return selectByGoogleSubStmt.get(profile.sub)!;
}

export function findUserById(id: string): UserRecord | null {
  return selectByIdStmt.get(id) ?? null;
}
