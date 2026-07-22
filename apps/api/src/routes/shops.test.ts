import { describe, expect, test } from 'bun:test';
import { createShopsStore } from '../db/shopsTable';
import type { UserRecord } from '../db/usersTable';
import { createTestDatabase, seedUser } from '../test/createTestDatabase';
import {
  createDeleteShop,
  createGetShops,
  createPatchShop,
  createPostShop,
  parseCreateShopBody,
} from './shops';

function adminUser(id: string): UserRecord {
  return {
    id,
    google_sub: `${id}-g`,
    email: `${id}@example.com`,
    name: null,
    avatar_url: null,
    is_admin: 1,
  };
}

function regularUser(id: string): UserRecord {
  return {
    id,
    google_sub: `${id}-g`,
    email: `${id}@example.com`,
    name: null,
    avatar_url: null,
    is_admin: 0,
  };
}

function callGet(deps: Parameters<typeof createGetShops>[0], auth = { userId: '', sessionId: '' }) {
  const handler = createGetShops(deps);
  const request = new Request('http://example.test/api/shops');
  return handler(request as never, { auth, url: new URL(request.url) });
}

function callPost(
  body: unknown,
  deps: Parameters<typeof createPostShop>[0],
  auth = { userId: 'user-1', sessionId: 'session-1' },
) {
  const handler = createPostShop(deps);
  const request = new Request('http://example.test/api/shops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handler(request as never, { auth, url: new URL(request.url) });
}

function callPatch(
  shopId: string,
  body: unknown,
  deps: Parameters<typeof createPatchShop>[0],
  auth = { userId: 'user-1', sessionId: 'session-1' },
) {
  const handler = createPatchShop(deps);
  const request = new Request(`http://example.test/api/shops/${shopId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handler(request as never, { auth, url: new URL(request.url) });
}

function callDelete(
  shopId: string,
  deps: Parameters<typeof createDeleteShop>[0],
  auth = { userId: 'user-1', sessionId: 'session-1' },
) {
  const handler = createDeleteShop(deps);
  const request = new Request(`http://example.test/api/shops/${shopId}`, {
    method: 'DELETE',
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

  test('rejects text fields above their configured limit', () => {
    const result = parseCreateShopBody({
      name: 'Catan Cafe',
      city: 'Springfield',
      address: 'x'.repeat(501),
    });
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
    const body = (await response.json()) as { items: { id: string; name: string }[] };
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
      },
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
      { userId: 'admin-1', sessionId: 'session-1' },
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      item: { id: string; name: string; city: string; state: string | null; zip: string | null };
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
      { userId: 'admin-1', sessionId: 'session-1' },
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      item: { latitude: number | null; longitude: number | null };
    };
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
      { userId: 'admin-1', sessionId: 'session-1' },
    );
    expect(response.status).toBe(400);
  });
});

function makeShop(shopsStore: ReturnType<typeof createShopsStore>, id = 'shop-1') {
  return shopsStore.createShop({
    id,
    name: 'Catan Cafe',
    city: 'Springfield',
    state: 'CA',
    zip: '94110',
    address: '1 Main St',
    website_url: 'https://catancafe.test',
    latitude: 40.7128,
    longitude: -74.006,
  });
}

describe('createPatchShop', () => {
  test('returns 404 for non-admin users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    const shopsStore = createShopsStore(database);
    makeShop(shopsStore);
    const response = await callPatch(
      'shop-1',
      { name: 'New Name', city: 'Springfield' },
      {
        findUser: (id) => (id === 'user-1' ? regularUser('user-1') : null),
        shopsStore,
      },
    );
    expect(response.status).toBe(404);
  });

  test('updates a shop for admin users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const shopsStore = createShopsStore(database);
    makeShop(shopsStore);

    const response = await callPatch(
      'shop-1',
      {
        name: 'Catan Cafe Renamed',
        city: 'Shelbyville',
        state: 'NY',
        zip: '10001',
        address: '2 Elm St',
        website_url: 'https://catancafe.example',
        latitude: 41,
        longitude: -73,
      },
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore,
      },
      { userId: 'admin-1', sessionId: 'session-1' },
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      item: { name: string; city: string; state: string | null; latitude: number | null };
    };
    expect(body.item).toMatchObject({
      name: 'Catan Cafe Renamed',
      city: 'Shelbyville',
      state: 'NY',
      zip: '10001',
      address: '2 Elm St',
      website_url: 'https://catancafe.example',
    });
    expect(body.item.latitude).toBeCloseTo(41);
  });

  test('returns 404 when the shop does not exist', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const response = await callPatch(
      'missing',
      { name: 'X', city: 'Y' },
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore: createShopsStore(database),
      },
      { userId: 'admin-1', sessionId: 'session-1' },
    );
    expect(response.status).toBe(404);
  });

  test('returns 400 when required fields are missing', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const shopsStore = createShopsStore(database);
    makeShop(shopsStore);
    const response = await callPatch(
      'shop-1',
      { city: 'Springfield' },
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore,
      },
      { userId: 'admin-1', sessionId: 'session-1' },
    );
    expect(response.status).toBe(400);
  });
});

describe('createDeleteShop', () => {
  test('returns 404 for non-admin users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    const shopsStore = createShopsStore(database);
    makeShop(shopsStore);
    const response = await callDelete('shop-1', {
      findUser: (id) => (id === 'user-1' ? regularUser('user-1') : null),
      shopsStore,
    });
    expect(response.status).toBe(404);
    expect(shopsStore.listAllShops()).toHaveLength(1);
  });

  test('deletes a shop for admin users', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const shopsStore = createShopsStore(database);
    makeShop(shopsStore);

    const response = await callDelete(
      'shop-1',
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore,
      },
      { userId: 'admin-1', sessionId: 'session-1' },
    );

    expect(response.status).toBe(204);
    expect(shopsStore.listAllShops()).toHaveLength(0);
  });

  test('returns 404 when the shop does not exist', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'admin-1', { isAdmin: true });
    const response = await callDelete(
      'missing',
      {
        findUser: (id) => (id === 'admin-1' ? adminUser('admin-1') : null),
        shopsStore: createShopsStore(database),
      },
      { userId: 'admin-1', sessionId: 'session-1' },
    );
    expect(response.status).toBe(404);
  });
});
