import { parse } from "@std/csv";

export interface BoardGame {
  id: string;
  name: string;
  yearpublished: string;
  rank: string;
  bayesaverage: string;
}

export async function getTopGames(): Promise<BoardGame[]> {
  const fileContent = await Deno.readTextFile("data/boardgames.csv");
  const games = parse(fileContent, {
    skipFirstRow: true,
  });

  // The CSV might have more columns than we strictly defined or needed,
  // but for type safety we cast or just rely on the parsed output structure.
  // We only want the first 100.
  return (games as unknown as BoardGame[]).slice(0, 100);
}
