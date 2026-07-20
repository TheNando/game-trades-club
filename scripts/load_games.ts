import { fileURLToPath } from "node:url";
import { createGamesStore } from "../apps/api/src/db/gamesTable";
import { db } from "../apps/api/src/db/client";
import { loadGameRanksCsv, resolveCsvPath } from "./gameRanks";

export const DEFAULT_RANKS_CSV_PATH = fileURLToPath(
  new URL("./boardgames_ranks.csv", import.meta.url)
);

export async function loadGameRanksFromPath(csvPath: string): Promise<void> {
  const gamesFile = await Bun.file(csvPath).text();
  const gamesStore = createGamesStore(db);
  loadGameRanksCsv(gamesFile, gamesStore.createGamesBatch);
}

if (import.meta.main) {
  const csvPath = resolveCsvPath({
    args: process.argv.slice(2),
    defaultPath: DEFAULT_RANKS_CSV_PATH,
  });

  await loadGameRanksFromPath(csvPath);
}
