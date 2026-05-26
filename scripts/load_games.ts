import { parse } from "@std/csv/parse";
import gamesCsv from "./bgg.csv" with { type: "file" };
import { createGamesBatch, type CreateGameInput } from "../apps/api/src/db/gamesTable";

const BATCH_SIZE = 50;
const PROGRESS_INTERVAL = 5;

type CsvGame = {
    id: string;
    name: string;
    year: string;
    rank: string;
    bayes: string;
    average: string;
    ratings: string;
    is_expansion: string;
    rank_abstracts: string;
    rank_cgs: string;
    rank_children: string;
    rank_family: string;
    rank_party: string;
    rank_strategy: string;
    rank_thematic: string;
    rank_war: string;
};

// Read csv file and parse to games list
const gamesFile = await Bun.file(gamesCsv).text();
const games: CsvGame[] = parse(gamesFile, {
    columns: [
        "id",
        "name",
        "year",
        "rank",
        "bayes",
        "average",
        "ratings",
        "is_expansion",
        "rank_abstracts",
        "rank_cgs",
        "rank_children",
        "rank_family",
        "rank_party",
        "rank_strategy",
        "rank_thematic",
        "rank_war",
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
        year: game.year ? Number.parseInt(game.year, 10) : null,
        isExpansion: game.is_expansion === "1",
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
