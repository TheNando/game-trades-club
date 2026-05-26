import { db } from './client';

export type CreateGameInput = {
  id: number;
  name: string;
  imageUrl?: string | null;
  year?: number | null;
  isExpansion?: boolean | number;
};

const BATCH_SIZE = 50;

const insertStmt = db.query(
  `INSERT OR IGNORE INTO games (id, name, image_url, year, is_expansion)
   VALUES (?, ?, ?, ?, ?)`
);

const insertBatchTxn = db.transaction((games: CreateGameInput[]) => {
  for (const game of games) {
    insertStmt.run(
      game.id,
      game.name,
      game.imageUrl ?? null,
      game.year ?? null,
      game.isExpansion ? 1 : 0
    );
  }
});

export function createGamesBatch(games: CreateGameInput[]): void {
  if (games.length === 0) {
    return;
  }

  if (games.length > BATCH_SIZE) {
    throw new Error(`createGamesBatch accepts at most ${BATCH_SIZE} games per call.`);
  }

  insertBatchTxn(games);
}

export type GameSearchResult = {
  id: number;
  name: string;
  year: number | null;
};

const searchByNameStmt = db.prepare<GameSearchResult, [string, string, string, number]>(
  `SELECT id, name, year
   FROM games
   WHERE name LIKE ?
   ORDER BY
     CASE
       WHEN name = ? THEN 0    -- exact
       WHEN name LIKE ? THEN 1 -- starts with
       ELSE 2                  -- contains
     END,
     name ASC
   LIMIT ?`
);

export function searchGamesByName(query: string, limit = 25): GameSearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const normalizedLimit = Math.max(1, Math.min(100, limit));
  return searchByNameStmt.all(`%${trimmed}%`, trimmed, `${trimmed}%`, normalizedLimit);
}
