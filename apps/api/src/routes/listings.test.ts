import { describe, expect, mock, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedUser } from '../test/createTestDatabase';
import { createPostListing, parseCreateListingBody } from './listings';

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

describe('createPostListing', () => {
  test('syncs missing game credits after creating a listing', async () => {
    const syncGameCredits = mock(async () => true);
    const postListing = createPostListing({
      createListingId: () => 'listing-1',
      listingsStore: {
        createListing: () => ({
          id: 'listing-1',
          user_id: 'user-1',
          description: 'Near mint copy',
          game_id: 7,
          condition: 'good',
          price: 30,
          status: 'open',
          created_at: '2026-01-01 00:00:00',
          updated_at: '2026-01-01 00:00:00',
        }),
      } as never,
      syncGameCreditsIfMissing: syncGameCredits,
    });

    const request = new Request('http://example.test/api/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        description: 'Near mint copy',
        game_id: 7,
        condition: 'good',
        price: 30,
        status: 'open',
      }),
    });

    const response = await postListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(201);
    expect(syncGameCredits).toHaveBeenCalledWith(7);
  });

  test('still creates the listing when the credit sync fails', async () => {
    const syncGameCredits = mock(async () => {
      throw new Error('bgg unavailable');
    });
    const logger = { error: mock(() => undefined) };
    const postListing = createPostListing({
      createListingId: () => 'listing-1',
      listingsStore: {
        createListing: () => ({
          id: 'listing-1',
          user_id: 'user-1',
          description: null,
          game_id: 7,
          condition: 'good',
          price: 30,
          status: 'open',
          created_at: '2026-01-01 00:00:00',
          updated_at: '2026-01-01 00:00:00',
        }),
      } as never,
      logger,
      syncGameCreditsIfMissing: syncGameCredits,
    });

    const request = new Request('http://example.test/api/listings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        game_id: 7,
        condition: 'good',
        price: 30,
        status: 'open',
      }),
    });

    const response = await postListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(201);
    expect(logger.error).toHaveBeenCalled();
  });
});
