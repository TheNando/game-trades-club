import { describe, expect, test } from 'bun:test';
import { createConversationsStore } from '../db/conversationsTable';
import { createListingsStore } from '../db/listingsTable';
import { createMessagesStore } from '../db/messagesTable';
import { createTestDatabase, seedGame, seedListing, seedUser } from '../test/createTestDatabase';
import {
  createPostConversation,
  createPostMessage,
  createGetConversationDetail,
} from './conversations';
import type { RouteDependencies } from '../middleware/dependencies';

function makeDeps(userId: string, url: URL): RouteDependencies {
  return { auth: { userId, sessionId: 'session-1' }, url };
}

async function setupStores() {
  const database = await createTestDatabase();
  seedUser(database, 'user-a');
  seedUser(database, 'user-b');
  seedGame(database, 1);
  seedListing(database, { id: 'listing-1', userId: 'user-b', gameId: 1 });
  return {
    database,
    conversationsStore: createConversationsStore(database),
    messagesStore: createMessagesStore(database),
    listingsStore: createListingsStore(database),
  };
}

describe('createPostConversation', () => {
  test('returns 400 when recipient_id is missing', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: () => null,
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('recipient_id') });
  });

  test('returns 400 when sending to yourself', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'user-a', text: 'hello' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('yourself') });
  });

  test('returns 400 when recipient does not exist', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: () => null,
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'ghost', text: 'hello' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('recipient') });
  });

  test('returns 400 when listing does not belong to recipient', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
    });

    // listing-1 belongs to user-b; claiming it belongs to user-a should fail
    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'user-a', listing_id: 'listing-1', text: 'hi' }),
    });
    const res = await handler(req as never, makeDeps('user-b', new URL(req.url)));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('listing') });
  });

  test('creates conversation successfully when listing belongs to recipient', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
      createId: () => 'conv-new',
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'user-b', listing_id: 'listing-1', text: 'hi' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(201);
  });

  test('returns 400 when text is empty', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'user-b', text: '   ' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('text') });
  });

  test('reuses existing conversation for same listing instead of creating a duplicate', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    let idCounter = 0;
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
      createId: () => `id-${++idCounter}`,
    });

    const body = JSON.stringify({ recipient_id: 'user-b', listing_id: 'listing-1', text: 'first' });
    const make = () =>
      new Request('http://t/api/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });

    const res1 = await handler(
      make() as never,
      makeDeps('user-a', new URL('http://t/api/conversations')),
    );
    expect(res1.status).toBe(201);
    const first = ((await res1.json()) as { item: { id: string } }).item;

    const res2 = await handler(
      make() as never,
      makeDeps('user-a', new URL('http://t/api/conversations')),
    );
    expect(res2.status).toBe(200);
    const second = ((await res2.json()) as { item: { id: string } }).item;

    expect(second.id).toBe(first.id);
    expect(conversationsStore.findExistingBetween('user-a', 'user-b', 'listing-1')).toHaveLength(1);
  });

  test('returns 400 when text exceeds 5000 characters', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
    });

    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 'user-b', text: 'x'.repeat(5001) }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
  });

  test('returns 400 when recipient_id has an invalid type', async () => {
    const { conversationsStore, messagesStore, listingsStore } = await setupStores();
    const handler = createPostConversation({
      conversationsStore,
      messagesStore,
      listingsStore,
      findUser: (id) => ({ id }),
    });
    const req = new Request('http://t/api/conversations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: 42, text: 'hello' }),
    });
    const res = await handler(req as never, makeDeps('user-a', new URL(req.url)));
    expect(res.status).toBe(400);
  });
});

describe('createPostMessage', () => {
  test('returns 404 when conversation does not exist', async () => {
    const { conversationsStore, messagesStore } = await setupStores();
    const handler = createPostMessage({ conversationsStore, messagesStore });

    const url = new URL('http://t/api/conversations/missing/messages');
    const req = new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' }),
    });
    const res = await handler(req as never, makeDeps('user-a', url));
    expect(res.status).toBe(404);
  });

  test('returns 403 when sender is not a member of the conversation', async () => {
    const { database, conversationsStore, messagesStore } = await setupStores();
    database
      .query(
        `INSERT INTO conversations (id, sender_id, recipient_id, listing_id) VALUES (?, ?, ?, ?)`,
      )
      .run('conv-1', 'user-a', 'user-b', null);
    const handler = createPostMessage({ conversationsStore, messagesStore });

    const url = new URL('http://t/api/conversations/conv-1/messages');
    const req = new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hi' }),
    });
    const res = await handler(req as never, makeDeps('outsider', url));
    expect(res.status).toBe(403);
  });

  test('adds a message and returns 201 for a valid member', async () => {
    const { database, conversationsStore, messagesStore } = await setupStores();
    database
      .query(
        `INSERT INTO conversations (id, sender_id, recipient_id, listing_id) VALUES (?, ?, ?, ?)`,
      )
      .run('conv-1', 'user-a', 'user-b', null);
    let idN = 0;
    const handler = createPostMessage({
      conversationsStore,
      messagesStore,
      createId: () => `msg-${++idN}`,
    });

    const url = new URL('http://t/api/conversations/conv-1/messages');
    const req = new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'reply here' }),
    });
    const res = await handler(req as never, makeDeps('user-b', url));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { item: { text: string; sender_id: string } };
    expect(body.item.text).toBe('reply here');
    expect(body.item.sender_id).toBe('user-b');
  });
});

describe('createGetConversationDetail', () => {
  test('returns 403 when user is not a member', async () => {
    const { database, conversationsStore, messagesStore } = await setupStores();
    database
      .query(
        `INSERT INTO conversations (id, sender_id, recipient_id, listing_id) VALUES (?, ?, ?, ?)`,
      )
      .run('conv-1', 'user-a', 'user-b', null);
    const handler = createGetConversationDetail({ conversationsStore, messagesStore });

    const url = new URL('http://t/api/conversations/conv-1');
    const req = new Request(url);
    const res = await handler(req as never, makeDeps('outsider', url));
    expect(res.status).toBe(403);
  });

  test('returns 200 with conversation and messages for a member', async () => {
    const { database, conversationsStore, messagesStore } = await setupStores();
    database
      .query(
        `INSERT INTO conversations (id, sender_id, recipient_id, listing_id) VALUES (?, ?, ?, ?)`,
      )
      .run('conv-1', 'user-a', 'user-b', null);
    database
      .query(`INSERT INTO messages (id, conversation_id, sender_id, text) VALUES (?, ?, ?, ?)`)
      .run('msg-1', 'conv-1', 'user-a', 'Hello!');
    const handler = createGetConversationDetail({ conversationsStore, messagesStore });

    const url = new URL('http://t/api/conversations/conv-1');
    const req = new Request(url);
    const res = await handler(req as never, makeDeps('user-a', url));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { item: { id: string }; messages: { text: string }[] };
    expect(body.item.id).toBe('conv-1');
    expect(body.messages[0].text).toBe('Hello!');
  });
});
