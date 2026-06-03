import type { Database } from 'bun:sqlite';
import { db } from './client';

export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game: { id: number; name: string; };
  cover_image: { id: string; has_thumb: boolean; } | null;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  created_at: string;
  updated_at: string;
};

type ListingRow = {
  id: string;
  user_id: string;
  description: string | null;
  game_id: number;
  game_name: string;
  cover_image_id: string | null;
  cover_image_has_thumb: number | null;
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

function rowToListing(row: ListingRow): Listing {
  const cover = row.cover_image_id
    ? {
      id: row.cover_image_id,
      has_thumb: row.cover_image_has_thumb === 1,
    }
    : null;

  return {
    id: row.id,
    user_id: row.user_id,
    description: row.description,
    game: { id: row.game_id, name: row.game_name },
    cover_image: cover,
    condition: row.condition,
    price: row.price,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const listingSelectColumns = `listings.id, listings.user_id, listings.description, listings.game_id,
            games.name AS game_name,
            cover.id AS cover_image_id,
            CASE WHEN cover.thumb_stored_filename IS NOT NULL THEN 1 ELSE 0 END AS cover_image_has_thumb,
            listings.condition, listings.price, listings.status,
            listings.created_at, listings.updated_at`;

const listingCoverJoin = `JOIN games ON games.id = listings.game_id
     LEFT JOIN listing_images AS cover ON cover.id = (
       SELECT id FROM listing_images
       WHERE listing_id = listings.id
       ORDER BY created_at ASC, id ASC
       LIMIT 1
     )`;

export function createListingsStore(database: Database) {
  const listAllStmt = database.query<ListingRow, []>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     ORDER BY listings.created_at DESC`
  );

  const listStmt = database.query<ListingRow, [string]>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     WHERE listings.user_id = ?
     ORDER BY listings.created_at DESC`
  );

  const findStmt = database.query<ListingRow, [string, string]>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     WHERE listings.id = ? AND listings.user_id = ?`
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
    listAllListings(): Listing[] {
      return listAllStmt.all().map(rowToListing);
    },
    listListingsByUser(userId: string): Listing[] {
      return listStmt.all(userId).map(rowToListing);
    },
    findListingByIdForUser(listingId: string, userId: string): Listing | null {
      const row = findStmt.get(listingId, userId);
      return row ? rowToListing(row) : null;
    },
    createListing(userId: string, input: CreateListingInput): Listing {
      createStmt.run(
        input.id,
        userId,
        input.description,
        input.game_id,
        input.condition,
        input.price,
        input.status
      );

      return rowToListing(findStmt.get(input.id, userId)!);
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
  listAllListings,
  listListingsByUser,
  removeListing,
  updateListing,
} = listingsStore;
