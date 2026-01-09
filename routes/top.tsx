import { define } from "../utils.ts";

import { getTopGames } from "../utils/games.ts";

import GameId from "../islands/GameId.tsx";

export default define.page(async function TopGamesList(ctx) {
  const games = await getTopGames();

  ctx.state.title = "Top 100 Board Games";

  return (
    <div class="px-4 py-8 mx-auto min-h-screen">
      <div class="max-w-5xl mx-auto flex flex-col items-center justify-center">
        <h1 class="text-4xl font-bold mb-8">Top 100 Board Games</h1>

        <div class="w-full overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-blue-600">
                <th class="p-4 border-b">Rank</th>
                <th class="p-4 border-b">ID</th>
                <th class="p-4 border-b">Name</th>
                <th class="p-4 border-b">Year</th>
                <th class="p-4 border-b">Rating</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id} class="hover:bg-blue-500">
                  <td class="p-4 border-b">{game.rank}</td>
                  <td class="p-4 border-b font-semibold">
                    <GameId id={game.id} />
                  </td>
                  <td class="p-4 border-b font-semibold">{game.name}</td>
                  <td class="p-4 border-b">{game.yearpublished}</td>
                  <td class="p-4 border-b">
                    {parseFloat(game.bayesaverage).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
