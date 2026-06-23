import { BunRequest } from 'bun';
import { db } from '../db/client';
import { createConversationsStore } from '../db/conversationsTable';
import { createListingsStore } from '../db/listingsTable';
import { createMessagesStore } from '../db/messagesTable';
import { findUserById } from '../db/usersTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

const MAX_MESSAGE_LENGTH = 5000;

type ConversationsStore = ReturnType<typeof createConversationsStore>;
type MessagesStore = ReturnType<typeof createMessagesStore>;
type ListingsStore = Pick<ReturnType<typeof createListingsStore>, 'findListingByIdForUser'>;

type ConversationRouteOptions = {
  conversationsStore?: ConversationsStore;
  messagesStore?: MessagesStore;
  listingsStore?: ListingsStore;
  findUser?: (id: string) => { id: string; } | null;
  createId?: () => string;
};

const defaultConversationsStore = createConversationsStore(db);
const defaultMessagesStore = createMessagesStore(db);
const defaultListingsStore = createListingsStore(db);

function matchConversationId(url: URL) {
  return url.pathname.match(/^\/api\/conversations\/([^/]+)(?:\/messages)?$/)?.[1];
}

function isMember(conversation: { sender_id: string; recipient_id: string; }, userId: string) {
  return conversation.sender_id === userId || conversation.recipient_id === userId;
}

function forbidden() {
  return json({ error: 'Forbidden' }, { status: 403 });
}

function parseMessageText(value: unknown): string | Response {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return badRequest('text is required');
  if (text.length > MAX_MESSAGE_LENGTH) {
    return badRequest(`text must be ${MAX_MESSAGE_LENGTH} characters or fewer`);
  }
  return text;
}

export function createGetConversations({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getConversations(_: BunRequest<'/api/conversations'>, { auth }: RouteDependencies) {
    return json({ items: conversationsStore.listConversationsForUser(auth.userId) });
  };
}

export const getConversations = createGetConversations();

export function createGetUnreadCount({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getUnreadCount(_: BunRequest<'/api/conversations/unread-count'>, { auth }: RouteDependencies) {
    return json({ count: conversationsStore.getUnreadConversationCount(auth.userId) });
  };
}

export const getUnreadCount = createGetUnreadCount();

export function createGetConversationDetail({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
}: ConversationRouteOptions = {}) {
  return async function getConversationDetail(_: BunRequest<'/api/conversations/:id'>, { auth, url }: RouteDependencies) {
    const id = matchConversationId(url);
    if (!id) return badRequest('Invalid conversation ID');

    const conversation = conversationsStore.findConversationDetailById(id);
    if (!conversation) return notFound('Conversation not found');
    if (!isMember(conversation, auth.userId)) return forbidden();

    conversationsStore.markAsRead(id, auth.userId);
    const messages = messagesStore.listMessagesByConversation(id);
    return json({ item: conversation, messages });
  };
}

export const getConversationDetail = createGetConversationDetail();

type PostConversationBody = {
  recipient_id: string;
  listing_id?: string | null;
  text: string;
};

export function createPostConversation({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
  listingsStore = defaultListingsStore,
  findUser = findUserById,
  createId = () => randomToken(18),
}: ConversationRouteOptions = {}) {
  return async function postConversation(request: BunRequest<'/api/conversations'>, { auth }: RouteDependencies) {
    const body = await readJson<PostConversationBody>(request);
    if (!body) return badRequest('Invalid JSON body');
    if (!body.recipient_id) return badRequest('recipient_id is required');

    const text = parseMessageText(body.text);
    if (text instanceof Response) return text;

    if (body.recipient_id === auth.userId) return badRequest('Cannot start a conversation with yourself');
    if (!findUser(body.recipient_id)) return badRequest('recipient not found');

    const listingId = body.listing_id ?? null;
    if (listingId && !listingsStore.findListingByIdForUser(listingId, body.recipient_id)) {
      return badRequest('listing does not belong to the recipient');
    }

    const existing = listingId
      ? conversationsStore.findExistingBetween(auth.userId, body.recipient_id, listingId)[0] ?? null
      : null;

    const conversation = existing ?? conversationsStore.createConversation({
      id: createId(),
      sender_id: auth.userId,
      recipient_id: body.recipient_id,
      listing_id: listingId,
    });

    messagesStore.createMessage({
      id: createId(),
      conversation_id: conversation.id,
      sender_id: auth.userId,
      text,
    });

    return json({ item: conversation }, { status: existing ? 200 : 201 });
  };
}

export const postConversation = createPostConversation();

type PostMessageBody = {
  text: string;
};

export function createPostMessage({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
  createId = () => randomToken(18),
}: ConversationRouteOptions = {}) {
  return async function postMessage(request: BunRequest<'/api/conversations/:id/messages'>, { auth, url }: RouteDependencies) {
    const id = matchConversationId(url);
    if (!id) return badRequest('Invalid conversation ID');

    const body = await readJson<PostMessageBody>(request);
    if (!body) return badRequest('Invalid JSON body');

    const text = parseMessageText(body.text);
    if (text instanceof Response) return text;

    const conversation = conversationsStore.findConversationById(id);
    if (!conversation) return notFound('Conversation not found');
    if (!isMember(conversation, auth.userId)) return forbidden();

    const message = messagesStore.createMessage({
      id: createId(),
      conversation_id: id,
      sender_id: auth.userId,
      text,
    });

    return json({ item: message }, { status: 201 });
  };
}

export const postMessage = createPostMessage();

export function createGetExistingConversations({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getExistingConversations(_: BunRequest<'/api/conversations/existing'>, { auth, url }: RouteDependencies) {
    const otherUserId = url.searchParams.get('other_user_id');
    const listingId = url.searchParams.get('listing_id');

    if (!otherUserId || !listingId) {
      return badRequest('other_user_id and listing_id are required');
    }

    return json({ items: conversationsStore.findExistingBetween(auth.userId, otherUserId, listingId) });
  };
}

export const getExistingConversations = createGetExistingConversations();
