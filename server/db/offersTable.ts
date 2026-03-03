import { db } from './client';
// import { findTradeByIdForUser } from './tradesTable';

export type Offer = {
  id: string;
  user_id: string;
  trade_id: string | null;
  message: string | null;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
};

type CreateOfferInput = {
  id: string;
  tradeId?: string;
  message?: string;
  priceCents?: number;
};

type UpdateOfferInput = {
  tradeId?: string;
  message?: string;
  priceCents?: number;
};

// const listStmt = db.query<Offer, [string]>(
//   `SELECT id, user_id, trade_id, message, price_cents, created_at, updated_at
//    FROM offers
//    WHERE user_id = ?
//    ORDER BY created_at DESC`
// );

// const findStmt = db.query<Offer, [string, string]>(
//   `SELECT id, user_id, trade_id, message, price_cents, created_at, updated_at
//    FROM offers
//    WHERE id = ? AND user_id = ?`
// );

// const createStmt = db.query(
//   `INSERT INTO offers (id, user_id, trade_id, message, price_cents)
//    VALUES (?, ?, ?, ?, ?)`
// );

// const updateStmt = db.query(
//   `UPDATE offers
//    SET trade_id = COALESCE(?, trade_id),
//        message = COALESCE(?, message),
//        price_cents = COALESCE(?, price_cents),
//        updated_at = CURRENT_TIMESTAMP
//    WHERE id = ? AND user_id = ?`
// );

// const deleteStmt = db.query(`DELETE FROM offers WHERE id = ? AND user_id = ?`);

// export function listOffersByUser(userId: string): Offer[] {
//   return listStmt.all(userId);
// }

// export function findOfferByIdForUser(offerId: string, userId: string): Offer | null {
//   return findStmt.get(offerId, userId) ?? null;
// }

// export function createOffer(userId: string, input: CreateOfferInput): Offer | null {
//   if (input.tradeId && !findTradeByIdForUser(input.tradeId, userId)) {
//     return null;
//   }

//   createStmt.run(
//     input.id,
//     userId,
//     input.tradeId ?? null,
//     input.message ?? null,
//     input.priceCents ?? null
//   );

//   return findStmt.get(input.id, userId)!;
// }

// export function updateOffer(userId: string, offerId: string, input: UpdateOfferInput): boolean {
//   if (input.tradeId && !findTradeByIdForUser(input.tradeId, userId)) {
//     return false;
//   }

//   const result = updateStmt.run(
//     input.tradeId ?? null,
//     input.message ?? null,
//     input.priceCents ?? null,
//     offerId,
//     userId
//   );

//   return Number(result.changes) > 0;
// }

// export function removeOffer(userId: string, offerId: string): boolean {
//   const result = deleteStmt.run(offerId, userId);
//   return Number(result.changes) > 0;
// }
