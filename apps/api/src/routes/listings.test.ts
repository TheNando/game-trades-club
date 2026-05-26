import { describe, expect, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedUser } from '../test/createTestDatabase';
import { parseCreateListingBody } from './listings';

describe('parseCreateListingBody', () => {
  test('ignores abandoned image fields', () => {
    const parsed = parseCreateListingBody({
      description: '  Complete in box  ',
      game_id: '42',
      condition: 'good',
      price: '25',
      status: 'open',
      image_ids: '[1,2,3]',
      image_url: 'https://example.com/full.png',
      image_thumbnail_url: 'https://example.com/thumb.png',
    } as never);

    expect(parsed).toEqual({
      description: 'Complete in box',
      game_id: 42,
      condition: 'good',
      price: 25,
      status: 'open',
    });
  });
});

describe('createListingsStore', () => {
  test('creates a listing without image columns', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    const listings = createListingsStore(database);

    const created = listings.createListing(user.id, {
      id: 'listing-1',
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });

    expect(created).toMatchObject({
      id: 'listing-1',
      user_id: user.id,
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });

    const row = database
      .query(
        `SELECT id, user_id, description, game_id, condition, price, status
         FROM listings
         WHERE id = ?`
      )
      .get('listing-1');

    expect(row).toEqual({
      id: 'listing-1',
      user_id: user.id,
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });
  });
});
