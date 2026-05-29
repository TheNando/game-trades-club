import { describe, expect, mock, test } from 'bun:test';
import { createSyncGameCreditsIfMissing } from './syncGameCredits';

describe('createSyncGameCreditsIfMissing', () => {
  test('skips fetching when credits already exist', async () => {
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
      },
    });

    await expect(sync(7)).resolves.toBe(false);
    expect(fetchGameCreditsFn).not.toHaveBeenCalled();
  });

  test('fetches and stores credits when they are missing', async () => {
    const replaceGameCredits = mock(() => undefined);
    const credits = {
      publishers: [{ bggId: 1, description: null, name: 'Publisher' }],
      designers: [],
      artists: [],
      categories: [],
      mechanics: [],
    };
    const fetchGameCreditsFn = mock(async () => credits);

    const sync = createSyncGameCreditsIfMissing({
      fetchGameCreditsFn,
      gameCreditsStore: {
        listGameIdsMissingCredits: () => [7],
        replaceGameCredits,
      },
      gamesStore: {
        findGameById: () => ({ id: 7, name: 'Game 7' } as never),
      },
    });

    await expect(sync(7)).resolves.toBe(true);
    expect(fetchGameCreditsFn).toHaveBeenCalledWith({
      gameId: 7,
      gameName: 'Game 7',
    });
    expect(replaceGameCredits).toHaveBeenCalledWith(7, credits);
  });
});
