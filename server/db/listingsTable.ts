import { db } from './client';

export type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  game_id: number;
  condition: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type CreateListingInput = {
  id: string;
  title: string;
  description: string;
  game_id: number;
  condition: string;
  status: string;
};

type UpdateListingInput = {
  title?: string;
  description?: string;
  game_id?: number;
  condition?: string;
  status?: string;
};

const listStmt = db.query<Listing, [string]>(
  `SELECT id, user_id, title, description, game_id, condition, status, created_at, updated_at
   FROM listings
   WHERE user_id = ?
   ORDER BY created_at DESC`
);

const findStmt = db.query<Listing, [string, string]>(
  `SELECT id, user_id, title, description, game_id, condition, status, created_at, updated_at
   FROM listings
   WHERE id = ? AND user_id = ?`
);

const createStmt = db.query(
  `INSERT INTO listings (id, user_id, title, description, game_id, condition, status)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const updateStmt = db.query(
  `UPDATE listings
   SET title = COALESCE(?, title),
       description = COALESCE(?, description),
       game_id = COALESCE(?, game_id),
       condition = COALESCE(?, condition),
       status = COALESCE(?, status),
       updated_at = CURRENT_TIMESTAMP
   WHERE id = ? AND user_id = ?`
);

const deleteStmt = db.query(`DELETE FROM listings WHERE id = ? AND user_id = ?`);

export function listListingsByUser(userId: string): Listing[] {
  return listStmt.all(userId);
}

export function findListingByIdForUser(listingId: string, userId: string): Listing | null {
  return findStmt.get(listingId, userId) ?? null;
}

export function createListing(userId: string, input: CreateListingInput): Listing {
  createStmt.run(
    input.id,
    userId,
    input.title,
    input.description,
    input.game_id,
    input.condition,
    input.status ?? 'open'
  );

  return findStmt.get(input.id, userId)!;
}

export function updateListing(userId: string, listingId: string, input: UpdateListingInput): boolean {
  const result = updateStmt.run(
    input.title ?? null,
    input.description ?? null,
    input.game_id ?? null,
    input.condition ?? null,
    input.status ?? null,
    listingId,
    userId
  );

  return Number(result.changes) > 0;
}

export function removeListing(userId: string, listingId: string): boolean {
  const result = deleteStmt.run(listingId, userId);
  return Number(result.changes) > 0;
}
