import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  DEFAULT_REFRESHED_RANKS_CSV_PATH,
  loadGameRanksCsv,
  resolveCsvPath,
  validateRanksCsvHeader,
  type CreateGamesBatch,
} from "./gameRanks";

type RefreshGameRanksOptions = {
  createGamesBatch?: CreateGamesBatch;
  csvUrl?: string;
  fetchFn?: FetchRanksCsv;
  logger?: Pick<Console, "log"> | null;
  outputPath?: string;
};

type FetchRanksCsv = (input: string) => Promise<Response>;

export async function downloadRanksCsv({
  csvUrl,
  fetchFn = fetch,
}: {
  csvUrl: string;
  fetchFn?: FetchRanksCsv;
}): Promise<string> {
  const response = await fetchFn(csvUrl);

  if (!response.ok) {
    throw new Error(`Failed to download ranks CSV: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  validateRanksCsvHeader(csvText);
  return csvText;
}

export async function refreshGameRanks({
  createGamesBatch,
  csvUrl = process.env.BOARDGAMES_RANKS_CSV_URL,
  fetchFn = fetch,
  logger = console,
  outputPath = DEFAULT_REFRESHED_RANKS_CSV_PATH,
}: RefreshGameRanksOptions = {}): Promise<void> {
  if (!csvUrl) {
    throw new Error("BOARDGAMES_RANKS_CSV_URL is required.");
  }

  const csvText = await downloadRanksCsv({ csvUrl, fetchFn });
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, csvText);

  let batchWriter = createGamesBatch;
  if (!batchWriter) {
    const [{ createGamesStore }, { db }] = await Promise.all([
      import("../apps/api/src/db/gamesTable"),
      import("../apps/api/src/db/client"),
    ]);
    batchWriter = createGamesStore(db).createGamesBatch;
  }

  loadGameRanksCsv(csvText, batchWriter, { logger });
}

if (import.meta.main) {
  const outputPath = resolveCsvPath({
    args: process.argv.slice(2),
    defaultPath: DEFAULT_REFRESHED_RANKS_CSV_PATH,
  });

  await refreshGameRanks({ outputPath });
}
