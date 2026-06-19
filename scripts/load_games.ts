import { parse } from "@std/csv/parse";
import gamesCsv from "./boardgames_ranks.csv" with { type: "file" };
import { createGamesBatch, type CreateGameInput } from "../apps/api/src/db/gamesTable";

const BATCH_SIZE = 50;
const PROGRESS_INTERVAL = 5;

type CsvGame = {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  bayesaverage: string;
  average: string;
  usersrated: string;
  is_expansion: string;
  abstracts_rank: string;
  cgs_rank: string;
  childrensgames_rank: string;
  familygames_rank: string;
  partygames_rank: string;
  strategygames_rank: string;
  thematic_rank: string;
  wargames_rank: string;
};

function parseRating(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Read csv file and parse to games list
const gamesFile = await Bun.file(gamesCsv).text();
const games: CsvGame[] = parse(gamesFile, {
  columns: [
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
  ],
  skipFirstRow: true,
});

const total = games.length;
let inserted = 0;
let nextProgress = PROGRESS_INTERVAL;

// Iterate through each games and insert record into db in batch
for (let i = 0; i < total; i += BATCH_SIZE) {
  const slice = games.slice(i, i + BATCH_SIZE);
  const batch: CreateGameInput[] = slice.map((game) => ({
    id: Number.parseInt(game.id, 10),
    name: game.name.trim(),
    year: game.yearpublished ? Number.parseInt(game.yearpublished, 10) : null,
    isExpansion: game.is_expansion === "1",
    rating: parseRating(game.average),
    adjustedRating: parseRating(game.bayesaverage),
  }));

  createGamesBatch(batch);
  inserted += batch.length;

  // Report on progress at each progress interval threshold
  const percentComplete = Math.floor((inserted / total) * 100);
  while (percentComplete >= nextProgress && nextProgress <= 100) {
    console.log(`${nextProgress}% complete (${inserted}/${total})`);
    nextProgress += PROGRESS_INTERVAL;
  }
}

if (nextProgress <= 100) {
  console.log(`100% complete (${inserted}/${total})`);
}
