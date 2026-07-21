import { describe, expect, test } from 'bun:test';
import { createListingFiltersStore } from '../db/listingFiltersTable';
import { createTestDatabase, seedGame, seedListing, seedUser } from '../test/createTestDatabase';
import { createGetListingFilters } from './listingFilters';

async function seedFiltersFixture() {
  const database = await createTestDatabase();
  seedUser(database);
  seedGame(database, 1);
  seedGame(database, 2);
  seedGame(database, 3);

  database
    .query(`INSERT INTO categories (id, name) VALUES (?, ?), (?, ?), (?, ?)`)
    .run(10, 'Family', 20, 'War', 30, 'Unused');
  database
    .query(`INSERT INTO mechanics (id, name) VALUES (?, ?), (?, ?), (?, ?)`)
    .run(100, 'Drafting', 200, 'Hex grid', 300, 'Unused mechanic');

  database.query(`INSERT INTO game_categories (game_id, category_id) VALUES (?, ?)`).run(1, 10);
  database.query(`INSERT INTO game_categories (game_id, category_id) VALUES (?, ?)`).run(2, 20);
  database.query(`INSERT INTO game_categories (game_id, category_id) VALUES (?, ?)`).run(3, 30);
  database.query(`INSERT INTO game_mechanics (game_id, mechanic_id) VALUES (?, ?)`).run(1, 100);
  database.query(`INSERT INTO game_mechanics (game_id, mechanic_id) VALUES (?, ?)`).run(2, 200);
  database.query(`INSERT INTO game_mechanics (game_id, mechanic_id) VALUES (?, ?)`).run(3, 300);

  seedListing(database, { id: 'listing-1', gameId: 1 });
  seedListing(database, { id: 'listing-2', gameId: 2 });

  return database;
}

describe('createListingFiltersStore', () => {
  test('returns only categories linked to games with listings', async () => {
    const database = await seedFiltersFixture();
    const store = createListingFiltersStore(database);
    expect(store.listCategoriesWithListings()).toEqual([
      { id: 10, name: 'Family' },
      { id: 20, name: 'War' },
    ]);
  });

  test('returns only mechanics linked to games with listings', async () => {
    const database = await seedFiltersFixture();
    const store = createListingFiltersStore(database);
    expect(store.listMechanicsWithListings()).toEqual([
      { id: 100, name: 'Drafting' },
      { id: 200, name: 'Hex grid' },
    ]);
  });

  test('dedupes taxonomy options across multiple listings on the same game', async () => {
    const database = await seedFiltersFixture();
    seedListing(database, { id: 'listing-1-dup', gameId: 1 });
    const store = createListingFiltersStore(database);
    expect(store.listCategoriesWithListings().map((c) => c.id)).toEqual([10, 20]);
  });
});

describe('createGetListingFilters', () => {
  test('returns categories and mechanics in a 200 response', async () => {
    const database = await seedFiltersFixture();
    const handler = createGetListingFilters({
      listingFiltersStore: createListingFiltersStore(database),
    });

    const url = new URL('http://example.test/api/listing-filters');
    const response = await handler(new Request(url) as never, {
      auth: { userId: '', sessionId: '' },
      url,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      categories: { id: number; name: string; }[];
      mechanics: { id: number; name: string; }[];
    };
    expect(body.categories.map((c) => c.id)).toEqual([10, 20]);
    expect(body.mechanics.map((m) => m.id)).toEqual([100, 200]);
  });
});
