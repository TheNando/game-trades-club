import { describe, expect, mock, test } from 'bun:test';
import { createSyncGameInfoIfMissing } from './syncGameInfo';

const emptyCredits = {
  publishers: [],
  designers: [],
  artists: [],
  categories: [],
  mechanics: [],
};

const emptyStats = {
  minPlayers: null,
  maxPlayers: null,
  minPlaytime: null,
  maxPlaytime: null,
  rating: null,
  adjusted_rating: null,
  weight: null,
};

type GameRowOverrides = {
  id?: number;
  name?: string;
  image_url?: string | null;
};

function gameRow(overrides: GameRowOverrides = {}) {
  return {
    id: 7,
    name: 'Game 7',
    image_url: 'https://example.com/game.jpg',
    ...overrides,
  } as never;
}

describe('createSyncGameInfoIfMissing', () => {
  test('skips fetching when credits, stats, and image are already present', async () => {
    const fetchGameInfoFn = mock(async () => {
      throw new Error('should not fetch');
    });
    const ensureBggGameImageFn = mock(async () => null);
    const findGameImageFn = mock(async () => ({
      originalFilename: '7.jpg',
      mimeType: 'image/jpeg',
      thumbFilename: 'thumb_7.webp',
    }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn,
      findGameImageFn,
      GameInfoStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameInfo: () => undefined,
      },
      gamesStore: {
        findGameById: () => gameRow(),
        listGameIdsMissingStats: () => [],
        updateGameStats: () => undefined,
        updateGameImageUrl: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(false);
    expect(fetchGameInfoFn).not.toHaveBeenCalled();
    expect(ensureBggGameImageFn).not.toHaveBeenCalled();
  });

  test('fetches and stores credits, stats, and image when all are missing', async () => {
    const replaceGameInfo = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const updateGameImageUrl = mock(() => undefined);
    const ensureBggGameImageFn = mock(async () => null);
    const findGameImageFn = mock(async () => null);
    const credits = {
      ...emptyCredits,
      publishers: [{ bggId: 1, description: null, name: 'Publisher' }],
    };
    const stats = { minPlayers: 2, maxPlayers: 4, minPlaytime: 30, maxPlaytime: 60, rating: null, adjusted_rating: null, weight: null };
    const imageUrl = 'https://example.com/new.jpg';
    const fetchGameInfoFn = mock(async () => ({ credits, imageUrl, stats }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn,
      findGameImageFn,
      GameInfoStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameInfo,
      },
      gamesStore: {
        findGameById: () => gameRow({ image_url: null }),
        listGameIdsMissingStats: () => [7],
        updateGameStats,
        updateGameImageUrl,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(fetchGameInfoFn).toHaveBeenCalledWith({ gameId: 7, gameName: 'Game 7' });
    expect(replaceGameInfo).toHaveBeenCalledWith(7, credits);
    expect(updateGameStats).toHaveBeenCalledWith(7, stats);
    expect(updateGameImageUrl).toHaveBeenCalledWith(7, imageUrl);
    expect(ensureBggGameImageFn).toHaveBeenCalledWith(7, imageUrl);
  });

  test('only updates stats when credits already exist but stats are missing', async () => {
    const replaceGameInfo = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const stats = { minPlayers: 1, maxPlayers: 5, minPlaytime: 20, maxPlaytime: 40, rating: null, adjusted_rating: null, weight: null };
    const fetchGameInfoFn = mock(async () => ({
      credits: emptyCredits,
      imageUrl: null,
      stats,
    }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn: mock(async () => null),
      findGameImageFn: mock(async () => ({
        originalFilename: '7.jpg',
        mimeType: 'image/jpeg',
        thumbFilename: 'thumb_7.webp',
      })),
      GameInfoStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameInfo,
      },
      gamesStore: {
        findGameById: () => gameRow(),
        listGameIdsMissingStats: () => [7],
        updateGameStats,
        updateGameImageUrl: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(replaceGameInfo).not.toHaveBeenCalled();
    expect(updateGameStats).toHaveBeenCalledWith(7, stats);
  });

  test('fetches stats when ratings are missing even if other info is present', async () => {
    const updateGameStats = mock(() => undefined);
    const stats = {
      minPlayers: 1,
      maxPlayers: 5,
      minPlaytime: 20,
      maxPlaytime: 40,
      rating: 7.6,
      adjusted_rating: 7.2,
      weight: 2.7,
    };
    const fetchGameInfoFn = mock(async () => ({
      credits: emptyCredits,
      imageUrl: null,
      stats,
    }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn: mock(async () => null),
      findGameImageFn: mock(async () => ({
        originalFilename: '7.jpg',
        mimeType: 'image/jpeg',
        thumbFilename: 'thumb_7.webp',
      })),
      GameInfoStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameInfo: () => undefined,
      },
      gamesStore: {
        findGameById: () => gameRow(),
        listGameIdsMissingStats: () => [7],
        updateGameStats,
        updateGameImageUrl: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(fetchGameInfoFn).toHaveBeenCalledWith({ gameId: 7, gameName: 'Game 7' });
    expect(updateGameStats).toHaveBeenCalledWith(7, stats);
  });

  test('fetches when only credits are missing and still writes stats', async () => {
    const replaceGameInfo = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const fetchGameInfoFn = mock(async () => ({
      credits: emptyCredits,
      imageUrl: null,
      stats: emptyStats,
    }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn: mock(async () => null),
      findGameImageFn: mock(async () => ({
        originalFilename: '7.jpg',
        mimeType: 'image/jpeg',
        thumbFilename: 'thumb_7.webp',
      })),
      GameInfoStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameInfo,
      },
      gamesStore: {
        findGameById: () => gameRow(),
        listGameIdsMissingStats: () => [],
        updateGameStats,
        updateGameImageUrl: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(replaceGameInfo).toHaveBeenCalledWith(7, emptyCredits);
    expect(updateGameStats).toHaveBeenCalledWith(7, emptyStats);
  });

  test('downloads the image when image_url is known but no local file exists', async () => {
    const fetchGameInfoFn = mock(async () => {
      throw new Error('should not fetch');
    });
    const ensureBggGameImageFn = mock(async () => null);
    const findGameImageFn = mock(async () => null);
    const updateGameImageUrl = mock(() => undefined);

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn,
      findGameImageFn,
      GameInfoStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameInfo: () => undefined,
      },
      gamesStore: {
        findGameById: () => gameRow({ image_url: 'https://example.com/cached.jpg' }),
        listGameIdsMissingStats: () => [],
        updateGameStats: () => undefined,
        updateGameImageUrl,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(fetchGameInfoFn).not.toHaveBeenCalled();
    expect(updateGameImageUrl).not.toHaveBeenCalled();
    expect(ensureBggGameImageFn).toHaveBeenCalledWith(7, 'https://example.com/cached.jpg');
  });

  test('does not persist image_url when fetch returns null', async () => {
    const updateGameImageUrl = mock(() => undefined);
    const ensureBggGameImageFn = mock(async () => null);
    const fetchGameInfoFn = mock(async () => ({
      credits: emptyCredits,
      imageUrl: null,
      stats: emptyStats,
    }));

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn,
      ensureBggGameImageFn,
      findGameImageFn: mock(async () => null),
      GameInfoStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameInfo: () => undefined,
      },
      gamesStore: {
        findGameById: () => gameRow({ image_url: null }),
        listGameIdsMissingStats: () => [],
        updateGameStats: () => undefined,
        updateGameImageUrl,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(updateGameImageUrl).not.toHaveBeenCalled();
    expect(ensureBggGameImageFn).not.toHaveBeenCalled();
  });

  test('swallows ensureBggGameImage errors and still resolves', async () => {
    const logger = { error: mock(() => undefined) };
    const ensureBggGameImageFn = mock(async () => {
      throw new Error('boom');
    });

    const sync = createSyncGameInfoIfMissing({
      fetchGameInfoFn: mock(async () => {
        throw new Error('should not fetch');
      }),
      ensureBggGameImageFn,
      findGameImageFn: mock(async () => null),
      logger,
      GameInfoStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameInfo: () => undefined,
      },
      gamesStore: {
        findGameById: () => gameRow(),
        listGameIdsMissingStats: () => [],
        updateGameStats: () => undefined,
        updateGameImageUrl: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(logger.error).toHaveBeenCalled();
  });
});
