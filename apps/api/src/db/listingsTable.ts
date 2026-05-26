import type { Database } from 'bun:sqlite';
import { db } from './client';

export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  created_at: string;
  updated_at: string;
};

type CreateListingInput = {
  id: string;
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
};

type UpdateListingInput = {
  description?: string | null;
  game_id?: number;
  condition?: string;
  price?: number;
  status?: 'open' | 'pending' | 'complete';
};

export function createListingsStore(database: Database) {
  const listStmt = database.query<Listing, [string]>(
    `SELECT id, user_id, description, game_id, condition, price, status, created_at, updated_at
     FROM listings
     WHERE user_id = ?
     ORDER BY created_at DESC`
  );

  const findStmt = database.query<Listing, [string, string]>(
    `SELECT id, user_id, description, game_id, condition, price, status, created_at, updated_at
     FROM listings
     WHERE id = ? AND user_id = ?`
  );

  const createStmt = database.query(
    `INSERT INTO listings (
       id,
       user_id,
       description,
       game_id,
       condition,
       price,
       status
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const updateStmt = database.query(
    `UPDATE listings
     SET description = COALESCE(?, description),
         game_id = COALESCE(?, game_id),
         condition = COALESCE(?, condition),
         price = COALESCE(?, price),
         status = COALESCE(?, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  );

  const deleteStmt = database.query(`DELETE FROM listings WHERE id = ? AND user_id = ?`);

  return {
    listListingsByUser(userId: string) {
      return listStmt.all(userId);
    },
    findListingByIdForUser(listingId: string, userId: string) {
      return findStmt.get(listingId, userId) ?? null;
    },
    createListing(userId: string, input: CreateListingInput) {
      createStmt.run(
        input.id,
        userId,
        input.description,
        input.game_id,
        input.condition,
        input.price,
        input.status
      );

      return findStmt.get(input.id, userId)!;
    },
    updateListing(userId: string, listingId: string, input: UpdateListingInput) {
      const result = updateStmt.run(
        input.description ?? null,
        input.game_id ?? null,
        input.condition ?? null,
        input.price ?? null,
        input.status ?? null,
        listingId,
        userId
      );

      return Number(result.changes) > 0;
    },
    removeListing(userId: string, listingId: string) {
      const result = deleteStmt.run(listingId, userId);
      return Number(result.changes) > 0;
    },
  };
}

const listingsStore = createListingsStore(db);

export const {
  createListing,
  findListingByIdForUser,
  listListingsByUser,
  removeListing,
  updateListing,
} = listingsStore;
