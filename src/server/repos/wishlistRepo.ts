import { db } from '../db/client';

export type WishlistItem = {
  id: string;
  user_id: string;
  game_title: string;
  platform: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type CreateWishlistInput = {
  id: string;
  gameTitle: string;
  platform?: string;
  notes?: string;
};

type UpdateWishlistInput = {
  gameTitle?: string;
  platform?: string;
  notes?: string;
};

const listStmt = db.query<WishlistItem, [string]>(
  `SELECT id, user_id, game_title, platform, notes, created_at, updated_at
   FROM wishlist_items
   WHERE user_id = ?
   ORDER BY created_at DESC`
);

const findStmt = db.query<WishlistItem, [string, string]>(
  `SELECT id, user_id, game_title, platform, notes, created_at, updated_at
   FROM wishlist_items
   WHERE id = ? AND user_id = ?`
);

const createStmt = db.query(
  `INSERT INTO wishlist_items (id, user_id, game_title, platform, notes)
   VALUES (?, ?, ?, ?, ?)`
);

const updateStmt = db.query(
  `UPDATE wishlist_items
   SET game_title = COALESCE(?, game_title),
       platform = COALESCE(?, platform),
       notes = COALESCE(?, notes),
       updated_at = CURRENT_TIMESTAMP
   WHERE id = ? AND user_id = ?`
);

const deleteStmt = db.query(`DELETE FROM wishlist_items WHERE id = ? AND user_id = ?`);

export function listWishlistByUser(userId: string): WishlistItem[] {
  return listStmt.all(userId);
}

export function findWishlistItemByIdForUser(itemId: string, userId: string): WishlistItem | null {
  return findStmt.get(itemId, userId) ?? null;
}

export function createWishlistItem(userId: string, input: CreateWishlistInput): WishlistItem {
  createStmt.run(input.id, userId, input.gameTitle, input.platform ?? null, input.notes ?? null);
  return findStmt.get(input.id, userId)!;
}

export function updateWishlistItem(userId: string, itemId: string, input: UpdateWishlistInput): boolean {
  const result = updateStmt.run(
    input.gameTitle ?? null,
    input.platform ?? null,
    input.notes ?? null,
    itemId,
    userId
  );

  return Number(result.changes) > 0;
}

export function deleteWishlistItem(userId: string, itemId: string): boolean {
  const result = deleteStmt.run(itemId, userId);
  return Number(result.changes) > 0;
}
