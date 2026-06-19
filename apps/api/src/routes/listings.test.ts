import { describe, expect, mock, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedGame, seedListing, seedListingImage, seedUser } from '../test/createTestDatabase';
import {
  createDeleteListing,
  createGetListingDetail,
  createGetListings,
  createPatchListing,
  createPostListing,
  parseCreateListingBody,
  parseListingFilters,
} from './listings';

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

describe('parseListingFilters', () => {
  test('returns an empty filter set when no params are provided', () => {
    const filters = parseListingFilters(new URLSearchParams());
    expect(filters).toEqual({});
  });

  test('parses repeated and comma-separated multi-value params', () => {
    const params = new URLSearchParams();
    params.append('condition', 'new');
    params.append('condition', 'like_new,good');
    params.append('category', '1,2');
    params.append('mechanic', '7');
    params.set('price_min', '5');
    params.set('price_max', '50');
    params.set('year_min', '2010');
    params.set('year_max', '2024');
    params.set('players', '4');
    params.set('playtime', '60');

    expect(parseListingFilters(params)).toEqual({
      conditions: ['new', 'like_new', 'good'],
      priceMin: 5,
      priceMax: 50,
      yearMin: 2010,
      yearMax: 2024,
      players: 4,
      playtime: 60,
      categoryIds: [1, 2],
      mechanicIds: [7],
    });
  });

  test('rejects unknown condition values', async () => {
    const params = new URLSearchParams();
    params.set('condition', 'mint');
    const result = parseListingFilters(params);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects non-integer numeric params', async () => {
    const params = new URLSearchParams();
    params.set('price_min', 'cheap');
    const result = parseListingFilters(params);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects non-integer category ids', async () => {
    const params = new URLSearchParams();
    params.set('category', '1,foo');
    const result = parseListingFilters(params);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('parses weight_min and weight_max as floats', () => {
    const params = new URLSearchParams();
    params.set('weight_min', '1.5');
    params.set('weight_max', '3.5');
    const filters = parseListingFilters(params);
    expect(filters).toMatchObject({ weightMin: 1.5, weightMax: 3.5 });
  });

  test('parses min_rating with rating_type', () => {
    const params = new URLSearchParams();
    params.set('min_rating', '7.5');
    params.set('rating_type', 'adjusted');
    const filters = parseListingFilters(params);
    expect(filters).toMatchObject({ minRating: 7.5, ratingType: 'adjusted' });
  });

  test('rejects invalid rating_type values', async () => {
    const params = new URLSearchParams();
    params.set('rating_type', 'geek');
    const result = parseListingFilters(params);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects non-numeric weight params', async () => {
    const params = new URLSearchParams();
    params.set('weight_min', 'heavy');
    const result = parseListingFilters(params);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });
});

describe('createGetListings', () => {
  test('applies filters from the query string and returns matching listings', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedGame(database, 1);
    seedGame(database, 2);
    database.run(`UPDATE games SET min_players = 2, max_players = 4, min_playtime = 30, max_playtime = 60 WHERE id = 1`);
    database.run(`UPDATE games SET min_players = 4, max_players = 8, min_playtime = 90, max_playtime = 120 WHERE id = 2`);
    seedListing(database, { id: 'listing-cheap', gameId: 1 });
    seedListing(database, { id: 'listing-expensive', gameId: 2 });
    database.run(`UPDATE listings SET price = 10, condition = 'good' WHERE id = 'listing-cheap'`);
    database.run(`UPDATE listings SET price = 80, condition = 'new' WHERE id = 'listing-expensive'`);

    const listingsStore = createListingsStore(database);
    const getListings = createGetListings({ listingsStore });

    const url = new URL('http://example.test/api/listings?players=3&price_max=20&condition=good');
    const response = await getListings(new Request(url) as never, {
      auth: { userId: '', sessionId: '' },
      url,
    });

    expect(response.status).toBe(200);
    const body = await response.json() as { items: { id: string; }[]; };
    expect(body.items.map((item) => item.id)).toEqual(['listing-cheap']);
  });

  test('returns 400 when a query param is malformed', async () => {
    const database = await createTestDatabase();
    const getListings = createGetListings({ listingsStore: createListingsStore(database) });

    const url = new URL('http://example.test/api/listings?price_min=cheap');
    const response = await getListings(new Request(url) as never, {
      auth: { userId: '', sessionId: '' },
      url,
    });

    expect(response.status).toBe(400);
  });
});

describe('createListingsStore.listFilteredListings', () => {
  async function seedFiltersFixture() {
    const database = await createTestDatabase();
    seedUser(database);
    seedGame(database, 1);
    seedGame(database, 2);
    database.run(
      `UPDATE games SET year = 2015, min_players = 2, max_players = 4, min_playtime = 30, max_playtime = 60 WHERE id = 1`
    );
    database.run(
      `UPDATE games SET year = 2022, min_players = 4, max_players = 8, min_playtime = 90, max_playtime = 120 WHERE id = 2`
    );
    database
      .query(`INSERT INTO categories (id, name) VALUES (?, ?), (?, ?)`)
      .run(10, 'Family', 20, 'War');
    database
      .query(`INSERT INTO mechanics (id, name) VALUES (?, ?), (?, ?)`)
      .run(100, 'Drafting', 200, 'Hex grid');
    database.query(`INSERT INTO game_categories (game_id, category_id) VALUES (?, ?)`).run(1, 10);
    database.query(`INSERT INTO game_categories (game_id, category_id) VALUES (?, ?)`).run(2, 20);
    database.query(`INSERT INTO game_mechanics (game_id, mechanic_id) VALUES (?, ?)`).run(1, 100);
    database.query(`INSERT INTO game_mechanics (game_id, mechanic_id) VALUES (?, ?)`).run(2, 200);

    seedListing(database, { id: 'family-listing', gameId: 1 });
    seedListing(database, { id: 'war-listing', gameId: 2 });
    database.run(`UPDATE listings SET price = 15, condition = 'good' WHERE id = 'family-listing'`);
    database.run(`UPDATE listings SET price = 75, condition = 'new' WHERE id = 'war-listing'`);

    return createListingsStore(database);
  }

  test('returns all listings when no filters are applied', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({}).map((item) => item.id).sort();
    expect(ids).toEqual(['family-listing', 'war-listing']);
  });

  test('filters by condition (multi-value matches any)', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ conditions: ['good', 'fair'] }).map((item) => item.id);
    expect(ids).toEqual(['family-listing']);
  });

  test('filters by price range', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ priceMin: 50, priceMax: 100 }).map((item) => item.id);
    expect(ids).toEqual(['war-listing']);
  });

  test('filters by year range', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ yearMin: 2020 }).map((item) => item.id);
    expect(ids).toEqual(['war-listing']);
  });

  test('filters by player count using game min/max bounds', async () => {
    const store = await seedFiltersFixture();
    const idsAtThree = store.listFilteredListings({ players: 3 }).map((item) => item.id);
    expect(idsAtThree).toEqual(['family-listing']);
    const idsAtFour = store.listFilteredListings({ players: 4 }).map((item) => item.id).sort();
    expect(idsAtFour).toEqual(['family-listing', 'war-listing']);
  });

  test('filters by playtime using game min/max bounds', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ playtime: 100 }).map((item) => item.id);
    expect(ids).toEqual(['war-listing']);
  });

  test('filters by category (OR match across selected categories)', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ categoryIds: [10] }).map((item) => item.id);
    expect(ids).toEqual(['family-listing']);
    const bothIds = store.listFilteredListings({ categoryIds: [10, 20] }).map((item) => item.id).sort();
    expect(bothIds).toEqual(['family-listing', 'war-listing']);
  });

  test('filters by mechanic (OR match across selected mechanics)', async () => {
    const store = await seedFiltersFixture();
    const ids = store.listFilteredListings({ mechanicIds: [200] }).map((item) => item.id);
    expect(ids).toEqual(['war-listing']);
  });

  test('combines filters with AND semantics across distinct fields', async () => {
    const store = await seedFiltersFixture();
    const ids = store
      .listFilteredListings({ conditions: ['new'], priceMin: 50, players: 6 })
      .map((item) => item.id);
    expect(ids).toEqual(['war-listing']);
  });

  test('filters by weight range', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedGame(database, 1);
    seedGame(database, 2);
    database.run(`UPDATE games SET weight = 1.5 WHERE id = 1`);
    database.run(`UPDATE games SET weight = 3.8 WHERE id = 2`);
    seedListing(database, { id: 'light-listing', gameId: 1 });
    seedListing(database, { id: 'heavy-listing', gameId: 2 });

    const store = createListingsStore(database);
    const ids = store.listFilteredListings({ weightMin: 3.0 }).map((item) => item.id);
    expect(ids).toEqual(['heavy-listing']);

    const allIds = store.listFilteredListings({ weightMin: 1.0, weightMax: 4.0 }).map((item) => item.id).sort();
    expect(allIds).toEqual(['heavy-listing', 'light-listing']);
  });

  test('filters by average rating', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedGame(database, 1);
    seedGame(database, 2);
    database.run(`UPDATE games SET rating = 6.5, adjusted_rating = 6.0 WHERE id = 1`);
    database.run(`UPDATE games SET rating = 8.2, adjusted_rating = 7.9 WHERE id = 2`);
    seedListing(database, { id: 'low-rated', gameId: 1 });
    seedListing(database, { id: 'high-rated', gameId: 2 });

    const store = createListingsStore(database);

    const byAvg = store.listFilteredListings({ minRating: 7.0, ratingType: 'average' }).map((item) => item.id);
    expect(byAvg).toEqual(['high-rated']);

    const byBayes = store.listFilteredListings({ minRating: 7.5, ratingType: 'adjusted' }).map((item) => item.id);
    expect(byBayes).toEqual(['high-rated']);

    const lowBar = store.listFilteredListings({ minRating: 6.0, ratingType: 'adjusted' }).map((item) => item.id).sort();
    expect(lowBar).toEqual(['high-rated', 'low-rated']);
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
    const syncGameInfo = mock(async () => true);
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
      syncGameInfoIfMissing: syncGameInfo,
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
    expect(syncGameInfo).toHaveBeenCalledWith(7);
  });

  test('still creates the listing when the credit sync fails', async () => {
    const syncGameInfo = mock(async () => {
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
      syncGameInfoIfMissing: syncGameInfo,
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


describe('createPatchListing', () => {
  function patchRequest(listingId: string, body: unknown) {
    const request = new Request(`http://example.test/api/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { request, url: new URL(request.url) };
  }

  test('updates description, condition, and price and returns 204', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const listingsStore = createListingsStore(database);
    const patchListing = createPatchListing({ listingsStore });

    const { request, url } = patchRequest('listing-1', {
      description: 'Updated copy',
      condition: 'like_new',
      price: 42,
    });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(204);

    const detail = listingsStore.findListingDetailById('listing-1');
    expect(detail).toMatchObject({
      description: 'Updated copy',
      condition: 'like_new',
      price: 42,
    });
  });

  test('returns 404 when the listing belongs to a different user', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    seedUser(database, 'user-2');
    seedListing(database, { userId: 'user-1' });
    const listingsStore = createListingsStore(database);
    const patchListing = createPatchListing({ listingsStore });

    const { request, url } = patchRequest('listing-1', { price: 99 });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-2', sessionId: 'session-2' },
      url,
    });

    expect(response.status).toBe(404);

    const detail = listingsStore.findListingDetailById('listing-1');
    expect(detail?.price).toBe(20);
  });

  test('returns 404 when the listing does not exist', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    const patchListing = createPatchListing({
      listingsStore: createListingsStore(database),
    });

    const { request, url } = patchRequest('missing', { price: 10 });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(404);
  });

  test('returns 400 when price is negative', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const patchListing = createPatchListing({
      listingsStore: createListingsStore(database),
    });

    const { request, url } = patchRequest('listing-1', { price: -5 });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'price must be zero or greater' });
  });

  test('returns 400 when game_id is not an integer', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const patchListing = createPatchListing({
      listingsStore: createListingsStore(database),
    });

    const { request, url } = patchRequest('listing-1', { game_id: 'abc' });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'game_id must be an integer' });
  });

  test('leaves untouched fields alone when only one field is patched', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const listingsStore = createListingsStore(database);
    const patchListing = createPatchListing({ listingsStore });

    const { request, url } = patchRequest('listing-1', { price: 75 });

    const response = await patchListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(204);

    const detail = listingsStore.findListingDetailById('listing-1');
    expect(detail).toMatchObject({
      price: 75,
      description: 'Seed listing',
      condition: 'good',
      status: 'open',
    });
  });
});

describe('createDeleteListing', () => {
  function deleteRequest(listingId: string) {
    const request = new Request(`http://example.test/api/listings/${listingId}`, {
      method: 'DELETE',
    });
    return { request, url: new URL(request.url) };
  }

  test('deletes the listing and returns 204', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const listingsStore = createListingsStore(database);
    const deleteListing = createDeleteListing({ listingsStore });

    const { request, url } = deleteRequest('listing-1');

    const response = await deleteListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(204);
    expect(listingsStore.findListingDetailById('listing-1')).toBeNull();
  });

  test('returns 404 when the listing belongs to a different user', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    seedUser(database, 'user-2');
    seedListing(database, { userId: 'user-1' });
    const listingsStore = createListingsStore(database);
    const deleteListing = createDeleteListing({ listingsStore });

    const { request, url } = deleteRequest('listing-1');

    const response = await deleteListing(request as never, {
      auth: { userId: 'user-2', sessionId: 'session-2' },
      url,
    });

    expect(response.status).toBe(404);
    expect(listingsStore.findListingDetailById('listing-1')).not.toBeNull();
  });

  test('returns 404 when the listing does not exist', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    const deleteListing = createDeleteListing({
      listingsStore: createListingsStore(database),
    });

    const { request, url } = deleteRequest('missing');

    const response = await deleteListing(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url,
    });

    expect(response.status).toBe(404);
  });
});
