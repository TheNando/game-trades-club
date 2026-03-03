import { db } from './client';

export type Trade = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  platform: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type CreateTradeInput = {
  id: string;
  title: string;
  description?: string;
  platform?: string;
  status?: string;
};

type UpdateTradeInput = {
  title?: string;
  description?: string;
  platform?: string;
  status?: string;
};

// const listStmt = db.query<Trade, [string]>(
//   `SELECT id, user_id, title, description, platform, status, created_at, updated_at
//    FROM trades
//    WHERE user_id = ?
//    ORDER BY created_at DESC`
// );

// const findStmt = db.query<Trade, [string, string]>(
//   `SELECT id, user_id, title, description, platform, status, created_at, updated_at
//    FROM trades
//    WHERE id = ? AND user_id = ?`
// );

// const createStmt = db.query(
//   `INSERT INTO trades (id, user_id, title, description, platform, status)
//    VALUES (?, ?, ?, ?, ?, ?)`
// );

// const updateStmt = db.query(
//   `UPDATE trades
//    SET title = COALESCE(?, title),
//        description = COALESCE(?, description),
//        platform = COALESCE(?, platform),
//        status = COALESCE(?, status),
//        updated_at = CURRENT_TIMESTAMP
//    WHERE id = ? AND user_id = ?`
// );

// const deleteStmt = db.query(`DELETE FROM trades WHERE id = ? AND user_id = ?`);

// export function listTradesByUser(userId: string): Trade[] {
//   return listStmt.all(userId);
// }

// export function findTradeByIdForUser(tradeId: string, userId: string): Trade | null {
//   return findStmt.get(tradeId, userId) ?? null;
// }

// export function createTrade(userId: string, input: CreateTradeInput): Trade {
//   createStmt.run(
//     input.id,
//     userId,
//     input.title,
//     input.description ?? null,
//     input.platform ?? null,
//     input.status ?? 'open'
//   );

//   return findStmt.get(input.id, userId)!;
// }

// export function updateTrade(userId: string, tradeId: string, input: UpdateTradeInput): boolean {
//   const result = updateStmt.run(
//     input.title ?? null,
//     input.description ?? null,
//     input.platform ?? null,
//     input.status ?? null,
//     tradeId,
//     userId
//   );

//   return Number(result.changes) > 0;
// }

// export function removeTrade(userId: string, tradeId: string): boolean {
//   const result = deleteStmt.run(tradeId, userId);
//   return Number(result.changes) > 0;
// }
