import { describe, expect, mock, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedGame, seedListingImage, seedUser } from '../test/createTestDatabase';
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
    seedGame(database, 7);
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
      game: { id: 7, name: 'Game 7' },
      cover_image: null,
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

  test('returns the joined game id and name when listing user listings', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 42);
    const listings = createListingsStore(database);

    listings.createListing(user.id, {
      id: 'listing-1',
      description: null,
      game_id: 42,
      condition: 'good',
      price: 20,
      status: 'open',
    });

    const [listing] = listings.listListingsByUser(user.id);
    expect(listing.game).toEqual({ id: 42, name: 'Game 42' });
  });

  test('listAllListings returns listings across all users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    seedUser(database, 'user-2');
    seedGame(database, 1);
    const listings = createListingsStore(database);

    listings.createListing('user-1', {
      id: 'listing-a',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 10,
      status: 'open',
    });
    listings.createListing('user-2', {
      id: 'listing-b',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 20,
      status: 'open',
    });

    const all = listings.listAllListings();
    const userIds = all.map((listing) => listing.user_id).sort();
    expect(userIds).toEqual(['user-1', 'user-2']);
  });

  test('returns the earliest listing image as the cover image', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 1);
    const listings = createListingsStore(database);

    listings.createListing(user.id, {
      id: 'listing-1',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 20,
      status: 'open',
    });

    seedListingImage(database, {
      id: 'image-late',
      listingId: 'listing-1',
      ownerId: user.id,
      storedFilename: 'late.png',
      mimeType: 'image/png',
      createdAt: '2026-02-01 00:00:00',
    });
    seedListingImage(database, {
      id: 'image-early',
      listingId: 'listing-1',
      ownerId: user.id,
      storedFilename: 'early.jpg',
      mimeType: 'image/jpeg',
      createdAt: '2026-01-01 00:00:00',
    });

    const listing = listings.findListingByIdForUser('listing-1', user.id);
    expect(listing?.cover_image).toEqual({
      id: 'image-early',
      has_thumb: false,
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
          game: { id: 7, name: 'Catan' },
          cover_image: null,
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
          game: { id: 7, name: 'Catan' },
          cover_image: null,
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
