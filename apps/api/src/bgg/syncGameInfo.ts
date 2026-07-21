import { fetchGameInfo } from './gameInfo';
import { createGameInfoStore } from '../db/gameInfoTable';
import { db } from '../db/client';
import { createGamesStore } from '../db/gamesTable';
import { ensureBggGameImage, findGameImage } from '../storage/gameImageStorage';

type GameInfoStore = Pick<
  ReturnType<typeof createGameInfoStore>,
  'listGameIdsMissingCredits' | 'replaceGameInfo'
>;

type GamesStore = Pick<
  ReturnType<typeof createGamesStore>,
  'findGameById' | 'listGameIdsMissingStats' | 'updateGameStats' | 'updateGameImageUrl'
>;

type SyncGameInfoIfMissingOptions = {
  fetchGameInfoFn?: typeof fetchGameInfo;
  GameInfoStore?: GameInfoStore;
  gamesStore?: GamesStore;
  ensureBggGameImageFn?: typeof ensureBggGameImage;
  findGameImageFn?: typeof findGameImage;
  logger?: Pick<Console, 'error'>;
};

const defaultGamesStore = createGamesStore(db);
const defaultGameInfoStore = createGameInfoStore(db);

/** Creates an on-demand synchronizer for missing game enrichment. */
export function createSyncGameInfoIfMissing({
  fetchGameInfoFn = fetchGameInfo,
  GameInfoStore = defaultGameInfoStore,
  gamesStore = defaultGamesStore,
  ensureBggGameImageFn = ensureBggGameImage,
  findGameImageFn = findGameImage,
  logger = console,
}: SyncGameInfoIfMissingOptions = {}) {
  return async function syncGameInfoIfMissing(gameId: number) {
    const missingCredits = GameInfoStore.listGameIdsMissingCredits([gameId]).length > 0;
    const missingStats = gamesStore.listGameIdsMissingStats([gameId]).length > 0;

    const game = gamesStore.findGameById(gameId);
    if (!game) {
      return false;
    }

    const missingImageUrl = game.image_url === null;
    const missingLocalImage = game.image_url !== null && (await findGameImageFn(game.id)) === null;

    if (!missingCredits && !missingStats && !missingImageUrl && !missingLocalImage) {
      return false;
    }

    let resolvedImageUrl: string | null = game.image_url;

    if (missingCredits || missingStats || missingImageUrl) {
      const { credits, imageUrl, stats } = await fetchGameInfoFn({
        gameId: game.id,
        gameName: game.name,
      });

      if (missingCredits) {
        GameInfoStore.replaceGameInfo(game.id, credits);
      }
      gamesStore.updateGameStats(game.id, stats);

      if (missingImageUrl && imageUrl) {
        gamesStore.updateGameImageUrl(game.id, imageUrl);
        resolvedImageUrl = imageUrl;
      }
    }

    if (resolvedImageUrl) {
      try {
        await ensureBggGameImageFn(game.id, resolvedImageUrl);
      } catch (error) {
        logger.error(`Unable to ensure BGG image for game ${game.id}`, error);
      }
    }

    return true;
  };
}

/** Synchronizes missing game enrichment using application dependencies. */
export const syncGameInfoIfMissing = createSyncGameInfoIfMissing();
