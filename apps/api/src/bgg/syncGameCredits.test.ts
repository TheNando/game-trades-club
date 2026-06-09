import { describe, expect, mock, test } from 'bun:test';
import { createSyncGameCreditsIfMissing } from './syncGameCredits';

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
};

describe('createSyncGameCreditsIfMissing', () => {
  test('skips fetching when credits and stats already exist', async () => {
    const fetchGameCreditsFn = mock(async () => {
      throw new Error('should not fetch');
    });

    const sync = createSyncGameCreditsIfMissing({
      fetchGameCreditsFn,
      gameCreditsStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameCredits: () => undefined,
      },
      gamesStore: {
        findGameById: () => ({ id: 7, name: 'Game 7' } as never),
        listGameIdsMissingStats: () => [],
        updateGameStats: () => undefined,
      },
    });

    await expect(sync(7)).resolves.toBe(false);
    expect(fetchGameCreditsFn).not.toHaveBeenCalled();
  });

  test('fetches and stores credits and stats when both are missing', async () => {
    const replaceGameCredits = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const credits = {
      ...emptyCredits,
      publishers: [{ bggId: 1, description: null, name: 'Publisher' }],
    };
    const stats = { minPlayers: 2, maxPlayers: 4, minPlaytime: 30, maxPlaytime: 60 };
    const fetchGameCreditsFn = mock(async () => ({ credits, stats }));

    const sync = createSyncGameCreditsIfMissing({
      fetchGameCreditsFn,
      gameCreditsStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameCredits,
      },
      gamesStore: {
        findGameById: () => ({ id: 7, name: 'Game 7' } as never),
        listGameIdsMissingStats: () => [7],
        updateGameStats,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(fetchGameCreditsFn).toHaveBeenCalledWith({
      gameId: 7,
      gameName: 'Game 7',
    });
    expect(replaceGameCredits).toHaveBeenCalledWith(7, credits);
    expect(updateGameStats).toHaveBeenCalledWith(7, stats);
  });

  test('only updates stats when credits already exist but stats are missing', async () => {
    const replaceGameCredits = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const stats = { minPlayers: 1, maxPlayers: 5, minPlaytime: 20, maxPlaytime: 40 };
    const fetchGameCreditsFn = mock(async () => ({ credits: emptyCredits, stats }));

    const sync = createSyncGameCreditsIfMissing({
      fetchGameCreditsFn,
      gameCreditsStore: {
        listGameIdsMissingCredits: () => [],
        replaceGameCredits,
      },
      gamesStore: {
        findGameById: () => ({ id: 7, name: 'Game 7' } as never),
        listGameIdsMissingStats: () => [7],
        updateGameStats,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(replaceGameCredits).not.toHaveBeenCalled();
    expect(updateGameStats).toHaveBeenCalledWith(7, stats);
  });

  test('fetches when only credits are missing and still writes stats', async () => {
    const replaceGameCredits = mock(() => undefined);
    const updateGameStats = mock(() => undefined);
    const fetchGameCreditsFn = mock(async () => ({ credits: emptyCredits, stats: emptyStats }));

    const sync = createSyncGameCreditsIfMissing({
      fetchGameCreditsFn,
      gameCreditsStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameCredits,
      },
      gamesStore: {
        findGameById: () => ({ id: 7, name: 'Game 7' } as never),
        listGameIdsMissingStats: () => [],
        updateGameStats,
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(replaceGameCredits).toHaveBeenCalledWith(7, emptyCredits);
    expect(updateGameStats).toHaveBeenCalledWith(7, emptyStats);
  });
});
