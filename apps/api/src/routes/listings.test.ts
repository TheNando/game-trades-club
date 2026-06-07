import { describe, expect, mock, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedGame, seedListing, seedListingImage, seedUser } from '../test/createTestDatabase';
import { createGetListingDetail, createPostListing, parseCreateListingBody } from './listings';

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
      preferred_shop_id: null,
    });
  });

  test('accepts and trims preferred_shop_id', () => {
    const parsed = parseCreateListingBody({
      game_id: 1,
      condition: 'good',
      price: 10,
      status: 'open',
      preferred_shop_id: '  shop-1  ',
    });
    expect(parsed).toMatchObject({ preferred_shop_id: 'shop-1' });
  });

  test('normalizes empty preferred_shop_id to null', () => {
    const parsed = parseCreateListingBody({
      game_id: 1,
      condition: 'good',
      price: 10,
      status: 'open',
      preferred_shop_id: '   ',
    });
    expect(parsed).toMatchObject({ preferred_shop_id: null });
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

  test('findListingDetailById returns game, seller, and all images in created order', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 3);
    const listings = createListingsStore(database);

    listings.createListing(user.id, {
      id: 'listing-1',
      description: 'Sealed copy',
      game_id: 3,
      condition: 'new',
      price: 50,
      status: 'open',
    });

    seedListingImage(database, {
      id: 'image-second',
      listingId: 'listing-1',
      ownerId: user.id,
      storedFilename: 'b.png',
      mimeType: 'image/png',
      createdAt: '2026-02-01 00:00:00',
    });
    seedListingImage(database, {
      id: 'image-first',
      listingId: 'listing-1',
      ownerId: user.id,
      storedFilename: 'a.jpg',
      thumbStoredFilename: 'a_thumb.webp',
      mimeType: 'image/jpeg',
      createdAt: '2026-01-01 00:00:00',
    });

    const detail = listings.findListingDetailById('listing-1');

    expect(detail).toMatchObject({
      id: 'listing-1',
      user_id: user.id,
      description: 'Sealed copy',
      game: { id: 3, name: 'Game 3' },
      condition: 'new',
      price: 50,
      status: 'open',
    });
    expect(detail?.images).toEqual([
      { id: 'image-first', has_thumb: true },
      { id: 'image-second', has_thumb: false },
    ]);
    expect(detail?.seller.id).toBe(user.id);
    expect(detail?.seller.name).toBe('Test User');
  });

  test('findListingDetailById returns null when the listing does not exist', async () => {
    const database = await createTestDatabase();
    const listings = createListingsStore(database);

    expect(listings.findListingDetailById('missing')).toBeNull();
  });

  test('createListing persists preferred_shop_id and findListingDetailById returns the joined shop', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 9);
    database
      .query(
        `INSERT INTO shops (id, name, city, state, zip, address, website_url, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run('shop-1', 'Catan Cafe', 'Springfield', 'CA', '94110', '1 Main St', null, 40.7128, -74.006);

    const listings = createListingsStore(database);
    const created = listings.createListing(user.id, {
      id: 'listing-1',
      description: null,
      game_id: 9,
      condition: 'good',
      price: 20,
      status: 'open',
      preferred_shop_id: 'shop-1',
    });

    expect(created.preferred_shop_id).toBe('shop-1');

    const detail = listings.findListingDetailById('listing-1');
    expect(detail?.preferred_shop_id).toBe('shop-1');
    expect(detail?.preferred_shop).toMatchObject({
      id: 'shop-1',
      name: 'Catan Cafe',
      city: 'Springfield',
      state: 'CA',
      zip: '94110',
      address: '1 Main St',
      latitude: 40.7128,
      longitude: -74.006,
    });
  });

  test('updateListing clears preferred_shop_id when explicitly set to null', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 9);
    database
      .query(
        `INSERT INTO shops (id, name, city, address, website_url, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run('shop-1', 'Catan Cafe', 'Springfield', null, null, null, null);

    const listings = createListingsStore(database);
    listings.createListing(user.id, {
      id: 'listing-1',
      description: null,
      game_id: 9,
      condition: 'good',
      price: 20,
      status: 'open',
      preferred_shop_id: 'shop-1',
    });

    listings.updateListing(user.id, 'listing-1', { preferred_shop_id: null });

    const detail = listings.findListingDetailById('listing-1');
    expect(detail?.preferred_shop_id).toBeNull();
    expect(detail?.preferred_shop).toBeNull();
  });

  test('updateListing leaves preferred_shop_id untouched when omitted', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 9);
    database
      .query(
        `INSERT INTO shops (id, name, city, address, website_url, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run('shop-1', 'Catan Cafe', 'Springfield', null, null, null, null);

    const listings = createListingsStore(database);
    listings.createListing(user.id, {
      id: 'listing-1',
      description: null,
      game_id: 9,
      condition: 'good',
      price: 20,
      status: 'open',
      preferred_shop_id: 'shop-1',
    });

    listings.updateListing(user.id, 'listing-1', { price: 25 });

    const detail = listings.findListingDetailById('listing-1');
    expect(detail?.preferred_shop_id).toBe('shop-1');
    expect(detail?.price).toBe(25);
  });
});

describe('createGetListingDetail', () => {
  test('returns 200 with the listing detail when found', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const listingsStore = createListingsStore(database);
    const handler = createGetListingDetail({ listingsStore });

    const request = new Request('http://example.test/api/listings/listing-1');
    const response = await handler(request as never, {
      auth: { userId: '', sessionId: '' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { item: { id: string; seller: { id: string; }; }; };
    expect(body.item.id).toBe('listing-1');
    expect(body.item.seller.id).toBe('user-1');
  });

  test('returns 404 when the listing does not exist', async () => {
    const database = await createTestDatabase();
    const handler = createGetListingDetail({
      listingsStore: createListingsStore(database),
    });

    const request = new Request('http://example.test/api/listings/missing');
    const response = await handler(request as never, {
      auth: { userId: '', sessionId: '' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Listing not found' });
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
