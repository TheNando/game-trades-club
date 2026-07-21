import { describe, expect, test } from 'bun:test';
import { createGamesStore, type GameStats } from './gamesTable';
import { createTestDatabase, seedGame } from '../test/createTestDatabase';

const completeStats: GameStats = {
  minPlayers: 1,
  maxPlayers: 4,
  minPlaytime: 30,
  maxPlaytime: 90,
  rating: 7.4,
  adjusted_rating: 7.1,
  weight: 2.5,
};

describe('createGamesStore', () => {
  test('treats missing ratings as missing game stats', async () => {
    const database = await createTestDatabase();
    seedGame(database, 1);
    seedGame(database, 2);
    seedGame(database, 3);
    const store = createGamesStore(database);

    store.updateGameStats(1, completeStats);
    store.updateGameStats(2, { ...completeStats, rating: null });
    store.updateGameStats(3, { ...completeStats, adjusted_rating: null });

    expect(store.listGameIdsMissingStats([1, 2, 3])).toEqual([2, 3]);
  });

  test('does not report games with all stats populated', async () => {
    const database = await createTestDatabase();
    seedGame(database, 1);
    const store = createGamesStore(database);

    store.updateGameStats(1, completeStats);

    expect(store.listGameIdsMissingStats([1])).toEqual([]);
  });

  test('preserves existing non-null stats when incoming stats are null', async () => {
    const database = await createTestDatabase();
    seedGame(database, 1);
    const store = createGamesStore(database);

    store.updateGameStats(1, completeStats);
    store.updateGameStats(1, {
      minPlayers: null,
      maxPlayers: null,
      minPlaytime: null,
      maxPlaytime: null,
      rating: null,
      adjusted_rating: null,
      weight: null,
    });

    expect(store.findGameById(1)).toMatchObject({
      min_players: completeStats.minPlayers,
      max_players: completeStats.maxPlayers,
      min_playtime: completeStats.minPlaytime,
      max_playtime: completeStats.maxPlaytime,
      rating: completeStats.rating,
      adjusted_rating: completeStats.adjusted_rating,
      weight: completeStats.weight,
    });
  });

  test('preserves existing ratings when a bulk CSV row has empty rating fields', async () => {
    const database = await createTestDatabase();
    const store = createGamesStore(database);

    store.createGamesBatch([
      {
        id: 1,
        name: 'Seeded Game',
        year: 2024,
        isExpansion: false,
        rating: 7.3,
        adjustedRating: 7.0,
      },
    ]);
    store.createGamesBatch([
      {
        id: 1,
        name: 'Seeded Game',
        year: 2024,
        isExpansion: false,
        rating: null,
        adjustedRating: null,
      },
    ]);

    expect(store.findGameById(1)).toMatchObject({
      rating: 7.3,
      adjusted_rating: 7.0,
    });
  });
});
