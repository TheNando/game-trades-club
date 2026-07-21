import { describe, expect, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedGame, seedUser } from '../test/createTestDatabase';
import { createGetUserProfile } from './users';

type UserProfileBody = {
  user: { id: string; name: string | null; avatar_url: string | null; created_at: string };
  current_listings: { id: string; status: string }[];
  past_listings: { id: string; status: string }[];
};

function callHandler(userId: string, deps: Parameters<typeof createGetUserProfile>[0]) {
  const handler = createGetUserProfile(deps);
  const request = new Request(`http://example.test/api/users/${userId}`);
  return handler(request as never, {
    auth: { userId: '', sessionId: '' },
    url: new URL(request.url),
  });
}

describe('createGetUserProfile', () => {
  test('returns the public profile and splits listings into current and past', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    seedGame(database, 1);
    const listingsStore = createListingsStore(database);

    listingsStore.createListing(user.id, {
      id: 'listing-open',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 10,
      status: 'open',
    });
    listingsStore.createListing(user.id, {
      id: 'listing-pending',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 20,
      status: 'pending',
    });
    listingsStore.createListing(user.id, {
      id: 'listing-complete',
      description: null,
      game_id: 1,
      condition: 'good',
      price: 30,
      status: 'complete',
    });

    const response = await callHandler(user.id, {
      findUserPublicProfile: (id) =>
        id === user.id
          ? { id: user.id, name: 'Test User', avatar_url: null, created_at: '2026-01-01 00:00:00' }
          : null,
      listingsStore,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as UserProfileBody;
    expect(body.user).toEqual({
      id: user.id,
      name: 'Test User',
      avatar_url: null,
      created_at: '2026-01-01 00:00:00',
    });
    expect(body.current_listings.map((l) => l.id).sort()).toEqual([
      'listing-open',
      'listing-pending',
    ]);
    expect(body.past_listings.map((l) => l.id)).toEqual(['listing-complete']);
  });

  test('returns 404 when the user does not exist', async () => {
    const database = await createTestDatabase();
    const listingsStore = createListingsStore(database);

    const response = await callHandler('missing', {
      findUserPublicProfile: () => null,
      listingsStore,
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'User not found' });
  });

  test('returns 400 when the URL is malformed', async () => {
    const handler = createGetUserProfile({
      findUserPublicProfile: () => null,
      listingsStore: { listListingsByUser: () => [] },
    });

    const request = new Request('http://example.test/api/users/');
    const response = await handler(request as never, {
      auth: { userId: '', sessionId: '' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(400);
  });
});
