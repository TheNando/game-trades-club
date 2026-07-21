import { createGamesStore } from '../apps/api/src/db/gamesTable';
import { db } from '../apps/api/src/db/client';
import { DEFAULT_REFRESHED_RANKS_CSV_PATH, loadGameRanksCsv, resolveCsvPath } from './gameRanks';

/** Loads BoardGameGeek game ranks from a CSV file into the database. */
export async function loadGameRanksFromPath(csvPath: string): Promise<void> {
  const gamesFile = await Bun.file(csvPath).text();
  const gamesStore = createGamesStore(db);
  loadGameRanksCsv(gamesFile, gamesStore.createGamesBatch);
}

if (import.meta.main) {
  const csvPath = resolveCsvPath({
    args: process.argv.slice(2),
    defaultPath: DEFAULT_REFRESHED_RANKS_CSV_PATH,
  });

  await loadGameRanksFromPath(csvPath);
}
