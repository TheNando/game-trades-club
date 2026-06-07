import { describe, expect, test } from 'bun:test';
import { createShopsStore } from '../db/shopsTable';
import type { UserRecord } from '../db/usersTable';
import { createTestDatabase, seedUser } from '../test/createTestDatabase';
import { createGetShops, createPostShop, parseCreateShopBody } from './shops';

function adminUser(id: string): UserRecord {
  return { id, google_sub: `${id}-g`, email: `${id}@example.com`, name: null, avatar_url: null, is_admin: 1 };
}

function regularUser(id: string): UserRecord {
  return { id, google_sub: `${id}-g`, email: `${id}@example.com`, name: null, avatar_url: null, is_admin: 0 };
}

function callGet(
  deps: Parameters<typeof createGetShops>[0],
  auth = { userId: '', sessionId: '' }
) {
  const handler = createGetShops(deps);
  const request = new Request('http://example.test/api/shops');
  return handler(request as never, { auth, url: new URL(request.url) });
}

function callPost(
  body: unknown,
  deps: Parameters<typeof createPostShop>[0],
  auth = { userId: 'user-1', sessionId: 'session-1' }
) {
  const handler = createPostShop(deps);
  const request = new Request('http://example.test/api/shops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handler(request as never, { auth, url: new URL(request.url) });
}

describe('parseCreateShopBody', () => {
  test('trims fields and nulls empty optional fields', () => {
    const parsed = parseCreateShopBody({
      name: '  Catan Cafe  ',
      city: '  Springfield ',
      state: '   ',
      zip: '   ',
      address: '   ',
      website_url: ' https://catancafe.test ',
    });
    expect(parsed).toEqual({
      name: 'Catan Cafe',
      city: 'Springfield',
      state: null,
      zip: null,
      address: null,
      website_url: 'https://catancafe.test',
      latitude: null,
      longitude: null,
    });
  });

  test('trims and persists state and zip', () => {
    const parsed = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      state: '  CA ',
      zip: ' 94110 ',
    });
    expect(parsed).toMatchObject({ state: 'CA', zip: '94110' });
  });

  test('accepts numeric latitude/longitude', () => {
    const parsed = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      latitude: 40.7128,
      longitude: -74.006,
    });
    expect(parsed).toMatchObject({ latitude: 40.7128, longitude: -74.006 });
  });

  test('accepts stringified latitude/longitude', () => {
    const parsed = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      latitude: ' 40.7128 ',
      longitude: '-74.006',
    });
    expect(parsed).toMatchObject({ latitude: 40.7128, longitude: -74.006 });
  });

  test('rejects out-of-range latitude', () => {
    const result = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      latitude: 91,
      longitude: 0,
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects non-numeric coordinate', () => {
    const result = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      latitude: 'not-a-number',
      longitude: 0,
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects latitude without longitude', () => {
    const result = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      latitude: 40,
    });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects missing name', () => {
    const result = parseCreateShopBody({ city: 'Springfield' });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  test('rejects missing city', () => {
    const result = parseCreateShopBody({ name: 'Catan Cafe' });
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });
});

describe('createGetShops', () => {
  test('returns shops without authentication', async () => {
    const database = await createTestDatabase();
    const shopsStore = createShopsStore(database);
    shopsStore.createShop({
      id: 'shop-1',
      name: 'Catan Cafe',
      city: 'Springfield',
      state: null,
      zip: null,
      address: null,
      website_url: null,
      latitude: null,
      longitude: null,
    });

    const response = await callGet({ shopsStore });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { id: string; name: string; }[]; };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({ id: 'shop-1', name: 'Catan Cafe' });
  });
});

describe('createPostShop', () => {
  test('returns 404 for non-admin users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    const response = await callPost(
      { name: 'Catan Cafe', city: 'Springfield' },
      {
        findUser: (id) => (id === 'user-1' ? regularUser('user-1') : null),
        shopsStore: createShopsStore(database),
      }
    );
    expect(response.status).toBe(404);
  });

  test('creates a shop for admin users with state and zip', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const shopsStore = createShopsStore(database);
    const response = await callPost(
      {
        name: 'Catan Cafe',
        city: 'Springfield',
        state: 'CA',
        zip: '94110',
        address: '1 Main St',
        website_url: 'https://catancafe.test',
      },
      {
        createShopId: () => 'shop-1',
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore,
      },
      { userId: 'admin-1', sessionId: 'session-1' }
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      item: { id: string; name: string; city: string; state: string | null; zip: string | null; };
    };
    expect(body.item).toMatchObject({
      id: 'shop-1',
      name: 'Catan Cafe',
      city: 'Springfield',
      state: 'CA',
      zip: '94110',
      address: '1 Main St',
      website_url: 'https://catancafe.test',
    });
    expect(shopsStore.listAllShops()).toHaveLength(1);
  });

  test('persists latitude and longitude when provided', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const shopsStore = createShopsStore(database);
    const response = await callPost(
      { name: 'Catan Cafe', city: 'Springfield', latitude: 40.7128, longitude: -74.006 },
      {
        createShopId: () => 'shop-1',
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore,
      },
      { userId: 'admin-1', sessionId: 'session-1' }
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { item: { latitude: number | null; longitude: number | null; }; };
    expect(body.item.latitude).toBeCloseTo(40.7128);
    expect(body.item.longitude).toBeCloseTo(-74.006);
  });

  test('returns 400 when name or city is missing', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const response = await callPost(
      { city: 'Springfield' },
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore: createShopsStore(database),
      },
      { userId: 'admin-1', sessionId: 'session-1' }
    );
    expect(response.status).toBe(400);
  });
});
