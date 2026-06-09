import { fetchGameCredits } from './gameCredits';
import { createGameCreditsStore } from '../db/gameCreditsTable';
import { db } from '../db/client';
import { createGamesStore } from '../db/gamesTable';

type GameCreditsStore = Pick<
  ReturnType<typeof createGameCreditsStore>,
  'listGameIdsMissingCredits' | 'replaceGameCredits'
>;

type GamesStore = Pick<
  ReturnType<typeof createGamesStore>,
  'findGameById' | 'listGameIdsMissingStats' | 'updateGameStats'
>;

type SyncGameCreditsIfMissingOptions = {
  fetchGameCreditsFn?: typeof fetchGameCredits;
  gameCreditsStore?: GameCreditsStore;
  gamesStore?: GamesStore;
};

const defaultGamesStore = createGamesStore(db);
const defaultGameCreditsStore = createGameCreditsStore(db);

export function createSyncGameCreditsIfMissing({
  fetchGameCreditsFn = fetchGameCredits,
  gameCreditsStore = defaultGameCreditsStore,
  gamesStore = defaultGamesStore,
}: SyncGameCreditsIfMissingOptions = {}) {
  return async function syncGameCreditsIfMissing(gameId: number) {
    const missingCredits = gameCreditsStore.listGameIdsMissingCredits([gameId]).length > 0;
    const missingStats = gamesStore.listGameIdsMissingStats([gameId]).length > 0;
    if (!missingCredits && !missingStats) {
      return false;
    }

    const game = gamesStore.findGameById(gameId);
    if (!game) {
      return false;
    }

    const { credits, stats } = await fetchGameCreditsFn({
      gameId: game.id,
      gameName: game.name,
    });

    if (missingCredits) {
      gameCreditsStore.replaceGameCredits(game.id, credits);
    }
    gamesStore.updateGameStats(game.id, stats);
    return true;
  };
}

export const syncGameCreditsIfMissing = createSyncGameCreditsIfMissing();
