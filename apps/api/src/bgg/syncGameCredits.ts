import { fetchGameCredits } from './gameCredits';
import { createGameCreditsStore } from '../db/gameCreditsTable';
import { db } from '../db/client';
import { createGamesStore } from '../db/gamesTable';

type GameCreditsStore = Pick<
  ReturnType<typeof createGameCreditsStore>,
  'listGameIdsMissingCredits' | 'replaceGameCredits'
>;

type GamesStore = Pick<ReturnType<typeof createGamesStore>, 'findGameById'>;

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
    const missingGameIds = gameCreditsStore.listGameIdsMissingCredits([gameId]);
    if (missingGameIds.length === 0) {
      return false;
    }

    const game = gamesStore.findGameById(gameId);
    if (!game) {
      return false;
    }

    const credits = await fetchGameCreditsFn({
      gameId: game.id,
      gameName: game.name,
    });

    gameCreditsStore.replaceGameCredits(game.id, credits);
    return true;
  };
}

export const syncGameCreditsIfMissing = createSyncGameCreditsIfMissing();
