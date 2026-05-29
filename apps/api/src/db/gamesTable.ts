import { db } from './client';

export type CreateGameInput = {
  id: number;
  name: string;
  imageUrl?: string | null;
  year?: number | null;
  isExpansion?: boolean | number;
};

export type GameRow = {
  id: number;
  image_url: string | null;
  is_expansion: number;
  name: string;
  year: number | null;
};

const BATCH_SIZE = 50;

export type GameSearchResult = {
  id: number;
  name: string;
  year: number | null;
};

export function createGamesStore(database: typeof db) {
  const insertStmt = database.query(
    `INSERT INTO games (id, name, image_url, year, is_expansion)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       image_url = COALESCE(excluded.image_url, games.image_url),
       year = excluded.year,
       is_expansion = excluded.is_expansion`
  );

  const findByIdStmt = database.query<GameRow, [number]>(
    `SELECT id, name, image_url, year, is_expansion
     FROM games
     WHERE id = ?`
  );

  const searchByNameStmt = database.prepare<GameSearchResult, [string, string, string, number]>(
    `SELECT id, name, year
     FROM games
     WHERE name LIKE ?
     ORDER BY
       CASE
         WHEN name = ? THEN 0
         WHEN name LIKE ? THEN 1
         ELSE 2
       END,
       name ASC
     LIMIT ?`
  );

  const insertBatchTxn = database.transaction((games: CreateGameInput[]) => {
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

  return {
    createGamesBatch(games: CreateGameInput[]): void {
      if (games.length === 0) {
        return;
      }

      if (games.length > BATCH_SIZE) {
        throw new Error(`createGamesBatch accepts at most ${BATCH_SIZE} games per call.`);
      }

      insertBatchTxn(games);
    },
    findGameById(gameId: number) {
      return findByIdStmt.get(gameId) ?? null;
    },
    searchGamesByName(query: string, limit = 25): GameSearchResult[] {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const normalizedLimit = Math.max(1, Math.min(100, limit));
      return searchByNameStmt.all(`%${trimmed}%`, trimmed, `${trimmed}%`, normalizedLimit);
    },
  };
}

const gamesStore = createGamesStore(db);

export const {
  createGamesBatch,
  findGameById,
  searchGamesByName,
} = gamesStore;
