import type { Database, Statement } from 'bun:sqlite';

/** Represents one BoardGameGeek game credit. */
export type GameCreditRecord = {
  bggId: number | null;
  description?: string | null;
  name: string;
};

/** Groups BoardGameGeek credits by taxonomy. */
export type GameInfo = {
  artists: GameCreditRecord[];
  categories: GameCreditRecord[];
  designers: GameCreditRecord[];
  mechanics: GameCreditRecord[];
  publishers: GameCreditRecord[];
};

type CreditBucket = keyof GameInfo;

type NormalizedGameCreditRecord = {
  bggId: number | null;
  description: string | null;
  name: string;
};

type NormalizedGameInfo = Record<CreditBucket, NormalizedGameCreditRecord[]>;

type CreditTableConfig = {
  entityColumn: string;
  entityTable: string;
  joinTable: string;
};

const creditTableConfigs: Record<CreditBucket, CreditTableConfig> = {
  publishers: {
    entityTable: 'publishers',
    entityColumn: 'publisher_id',
    joinTable: 'game_publishers',
  },
  designers: {
    entityTable: 'designers',
    entityColumn: 'designer_id',
    joinTable: 'game_designers',
  },
  artists: {
    entityTable: 'artists',
    entityColumn: 'artist_id',
    joinTable: 'game_artists',
  },
  categories: {
    entityTable: 'categories',
    entityColumn: 'category_id',
    joinTable: 'game_categories',
  },
  mechanics: {
    entityTable: 'mechanics',
    entityColumn: 'mechanic_id',
    joinTable: 'game_mechanics',
  },
};

function normalizeCreditRecord(record: GameCreditRecord): NormalizedGameCreditRecord | null {
  const name = record.name.trim();
  if (!name) return null;

  return {
    bggId: record.bggId ?? null,
    description: record.description?.trim() || null,
    name,
  };
}

function dedupeCreditRecords(records: GameCreditRecord[]): NormalizedGameCreditRecord[] {
  const deduped = new Map<string, NormalizedGameCreditRecord>();

  for (const record of records) {
    const normalized = normalizeCreditRecord(record);
    if (!normalized) continue;

    const existing = deduped.get(normalized.name);
    if (!existing) {
      deduped.set(normalized.name, normalized);
      continue;
    }

    deduped.set(normalized.name, {
      name: normalized.name,
      bggId: existing.bggId ?? normalized.bggId,
      description: existing.description ?? normalized.description,
    });
  }

  return [...deduped.values()];
}

function normalizeGameInfo(credits: GameInfo): NormalizedGameInfo {
  return {
    artists: dedupeCreditRecords(credits.artists),
    categories: dedupeCreditRecords(credits.categories),
    designers: dedupeCreditRecords(credits.designers),
    mechanics: dedupeCreditRecords(credits.mechanics),
    publishers: dedupeCreditRecords(credits.publishers),
  };
}

/** Creates database operations for enriched game taxonomy. */
export function createGameInfoStore(database: Database) {
  type ClearJoinStatement = Statement<unknown, [number]>;
  type FindEntityStatement = Statement<{ id: number }, [string]>;
  type InsertJoinStatement = Statement<unknown, [number, number]>;
  type UpsertEntityStatement = Statement<unknown, [number | null, string, string | null]>;

  const clearJoinStatements = Object.fromEntries(
    Object.entries(creditTableConfigs).map(([bucket, config]) => [
      bucket,
      database.query<unknown, [number]>(`DELETE FROM ${config.joinTable} WHERE game_id = ?`),
    ]),
  ) as Record<CreditBucket, ClearJoinStatement>;

  const findEntityStatements = Object.fromEntries(
    Object.entries(creditTableConfigs).map(([bucket, config]) => [
      bucket,
      database.query<{ id: number }, [string]>(
        `SELECT id FROM ${config.entityTable} WHERE name = ?`,
      ),
    ]),
  ) as Record<CreditBucket, FindEntityStatement>;

  const insertJoinStatements = Object.fromEntries(
    Object.entries(creditTableConfigs).map(([bucket, config]) => [
      bucket,
      database.query<unknown, [number, number]>(
        `INSERT OR IGNORE INTO ${config.joinTable} (game_id, ${config.entityColumn})
         VALUES (?, ?)`,
      ),
    ]),
  ) as Record<CreditBucket, InsertJoinStatement>;

  const upsertEntityStatements = Object.fromEntries(
    Object.entries(creditTableConfigs).map(([bucket, config]) => [
      bucket,
      database.query<unknown, [number | null, string, string | null]>(
        `INSERT INTO ${config.entityTable} (bgg_id, name, description)
         VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET
           bgg_id = COALESCE(${config.entityTable}.bgg_id, excluded.bgg_id),
           description = COALESCE(${config.entityTable}.description, excluded.description)`,
      ),
    ]),
  ) as Record<CreditBucket, UpsertEntityStatement>;

  const listGamesWithAnyCreditsStmt = (gameIds: number[]) =>
    database
      .query<{ game_id: number }, number[]>(
        `SELECT DISTINCT game_id
         FROM (
           SELECT game_id FROM game_publishers WHERE game_id IN (${gameIds.map(() => '?').join(', ')})
           UNION
           SELECT game_id FROM game_designers WHERE game_id IN (${gameIds.map(() => '?').join(', ')})
           UNION
           SELECT game_id FROM game_artists WHERE game_id IN (${gameIds.map(() => '?').join(', ')})
           UNION
           SELECT game_id FROM game_categories WHERE game_id IN (${gameIds.map(() => '?').join(', ')})
           UNION
           SELECT game_id FROM game_mechanics WHERE game_id IN (${gameIds.map(() => '?').join(', ')})
         )`,
      )
      .all(...gameIds, ...gameIds, ...gameIds, ...gameIds, ...gameIds);

  const replaceGameInfoTxn = database.transaction((gameId: number, credits: GameInfo) => {
    const normalized = normalizeGameInfo(credits);

    for (const bucket of Object.keys(creditTableConfigs) as CreditBucket[]) {
      clearJoinStatements[bucket].run(gameId);

      for (const record of normalized[bucket]) {
        upsertEntityStatements[bucket].run(record.bggId, record.name, record.description);

        const entity = findEntityStatements[bucket].get(record.name) as { id: number } | null;
        if (!entity) {
          throw new Error(`Unable to find ${bucket} row for ${record.name}`);
        }

        insertJoinStatements[bucket].run(gameId, entity.id);
      }
    }
  });

  return {
    listGameIdsMissingCredits(gameIds: number[]) {
      if (gameIds.length === 0) return [];

      const gamesWithAnyCredits = new Set(
        listGamesWithAnyCreditsStmt(gameIds).map((row) => row.game_id),
      );
      return gameIds.filter((gameId) => !gamesWithAnyCredits.has(gameId));
    },
    replaceGameInfo(gameId: number, credits: GameInfo) {
      replaceGameInfoTxn(gameId, credits);
    },
  };
}
