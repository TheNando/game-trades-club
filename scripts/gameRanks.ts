import { parse } from "@std/csv/parse";
import type { CreateGameInput } from "../apps/api/src/db/gamesTable";
import { getDataPath } from "../apps/api/src/utils/paths";
import { join } from "node:path";

export const DEFAULT_REFRESHED_RANKS_CSV_PATH = join(getDataPath(), "boardgames_ranks.csv");

export const RANKS_CSV_COLUMNS = [
  "id",
  "name",
  "yearpublished",
  "rank",
  "bayesaverage",
  "average",
  "usersrated",
  "is_expansion",
  "abstracts_rank",
  "cgs_rank",
  "childrensgames_rank",
  "familygames_rank",
  "partygames_rank",
  "strategygames_rank",
  "thematic_rank",
  "wargames_rank",
] as const;

export const RANKS_CSV_HEADER = RANKS_CSV_COLUMNS.join(",");

const BATCH_SIZE = 50;
const PROGRESS_INTERVAL = 5;

type CsvGame = Record<(typeof RANKS_CSV_COLUMNS)[number], string>;

export type LoadGameRanksOptions = {
  batchSize?: number;
  logger?: Pick<Console, "log"> | null;
  progressInterval?: number;
};

export type LoadGameRanksResult = {
  inserted: number;
  total: number;
};

export type CreateGamesBatch = (games: CreateGameInput[]) => void;

export function validateRanksCsvHeader(csvText: string): void {
  const firstLine = csvText.split(/\r?\n/, 1)[0]?.trimEnd();
  if (firstLine !== RANKS_CSV_HEADER) {
    throw new Error("Ranks CSV header does not match the expected BoardGameGeek export format.");
  }
}

export function parseRating(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGameRanksCsv(csvText: string): CreateGameInput[] {
  validateRanksCsvHeader(csvText);

  const games = parse(csvText, {
    columns: [...RANKS_CSV_COLUMNS],
    skipFirstRow: true,
  }) as CsvGame[];

  return games.map((game) => ({
    id: Number.parseInt(game.id, 10),
    name: game.name.trim(),
    year: game.yearpublished ? Number.parseInt(game.yearpublished, 10) : null,
    isExpansion: game.is_expansion === "1",
    rating: parseRating(game.average),
    adjustedRating: parseRating(game.bayesaverage),
  }));
}

export function loadGameRanksCsv(
  csvText: string,
  createGamesBatch: CreateGamesBatch,
  {
    batchSize = BATCH_SIZE,
    logger = console,
    progressInterval = PROGRESS_INTERVAL,
  }: LoadGameRanksOptions = {}
): LoadGameRanksResult {
  const games = parseGameRanksCsv(csvText);
  const total = games.length;
  let inserted = 0;
  let nextProgress = progressInterval;

  for (let i = 0; i < total; i += batchSize) {
    const batch = games.slice(i, i + batchSize);
    createGamesBatch(batch);
    inserted += batch.length;

    if (logger && progressInterval > 0) {
      const percentComplete = Math.floor((inserted / total) * 100);
      while (percentComplete >= nextProgress && nextProgress <= 100) {
        logger.log(`${nextProgress}% complete (${inserted}/${total})`);
        nextProgress += progressInterval;
      }
    }
  }

  if (logger && total === 0) {
    logger.log("100% complete (0/0)");
  } else if (logger && progressInterval > 0 && nextProgress <= 100) {
    logger.log(`100% complete (${inserted}/${total})`);
  }

  return { inserted, total };
}

export function resolveCsvPath({
  args,
  defaultPath,
}: {
  args: string[];
  defaultPath: string;
}): string {
  let csvPath = defaultPath;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--csv") {
      const next = args[i + 1];
      if (!next) {
        throw new Error("--csv requires a path.");
      }
      csvPath = next;
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return csvPath;
}
