import { describe, expect, test } from 'bun:test';
import { createGameCreditsStore } from './gameCreditsTable';
import { createTestDatabase } from '../test/createTestDatabase';

async function seedGame(database: Awaited<ReturnType<typeof createTestDatabase>>, gameId = 1) {
  database
    .query(
      `INSERT INTO games (id, name, year, is_expansion)
       VALUES (?, ?, ?, ?)`
    )
    .run(gameId, `Game ${gameId}`, 2024, 0);
}

describe('createGameCreditsStore', () => {
  test('upserts unique names and creates join rows for a game', async () => {
    const database = await createTestDatabase();
    await seedGame(database, 1);
    await seedGame(database, 2);
    const store = createGameCreditsStore(database);

    store.replaceGameCredits(1, {
      publishers: [
        { bggId: 10, description: null, name: 'Capstone Games' },
      ],
      designers: [
        { bggId: 20, description: null, name: 'Reiner Knizia' },
        { bggId: 20, description: null, name: 'Reiner Knizia' },
      ],
      artists: [],
      categories: [{ bggId: 30, description: null, name: 'Economic' }],
      mechanics: [{ bggId: 40, description: null, name: 'Auction / Bidding' }],
    });

    store.replaceGameCredits(2, {
      publishers: [
        { bggId: 999, description: 'Ignored because name matches exactly', name: 'Capstone Games' },
      ],
      designers: [{ bggId: 21, description: null, name: 'Ricky Royal' }],
      artists: [],
      categories: [],
      mechanics: [],
    });

    const publishers = database
      .query<{ bgg_id: number | null; description: string | null; name: string }, []>(
        'SELECT name, bgg_id, description FROM publishers ORDER BY name ASC'
      )
      .all();

    const gamePublishers = database
      .query<{ game_id: number; publisher_id: number }, []>(
        'SELECT game_id, publisher_id FROM game_publishers ORDER BY game_id ASC'
      )
      .all();

    const designers = database
      .query<{ bgg_id: number | null; name: string }, []>(
        'SELECT name, bgg_id FROM designers ORDER BY name ASC'
      )
      .all();

    expect(publishers).toEqual([
      {
        name: 'Capstone Games',
        bgg_id: 10,
        description: 'Ignored because name matches exactly',
      },
    ]);
    expect(gamePublishers).toHaveLength(2);
    expect(designers).toEqual([
      { name: 'Reiner Knizia', bgg_id: 20 },
      { name: 'Ricky Royal', bgg_id: 21 },
    ]);
  });

  test('finds games that still need credits scraped when no join rows exist', async () => {
    const database = await createTestDatabase();
    await seedGame(database, 1);
    await seedGame(database, 2);
    const store = createGameCreditsStore(database);

    store.replaceGameCredits(1, {
      publishers: [{ bggId: 10, description: null, name: 'Capstone Games' }],
      designers: [],
      artists: [],
      categories: [],
      mechanics: [],
    });

    store.replaceGameCredits(2, {
      publishers: [],
      designers: [],
      artists: [],
      categories: [],
      mechanics: [],
    });

    expect(store.listGameIdsMissingCredits([1, 2, 3])).toEqual([2, 3]);
  });
});
