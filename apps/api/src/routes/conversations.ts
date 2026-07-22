import { BunRequest } from 'bun';
import {
  createConversationSchema,
  createMessageSchema,
  existingConversationQuerySchema,
} from '@game-trades-club/shared/validation';
import { z } from 'zod';
import { db } from '../db/client';
import { createConversationsStore } from '../db/conversationsTable';
import { createListingsStore } from '../db/listingsTable';
import { createMessagesStore } from '../db/messagesTable';
import { findUserById } from '../db/usersTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type ConversationsStore = ReturnType<typeof createConversationsStore>;
type MessagesStore = ReturnType<typeof createMessagesStore>;
type ListingsStore = Pick<ReturnType<typeof createListingsStore>, 'findListingByIdForUser'>;

type ConversationRouteOptions = {
  conversationsStore?: ConversationsStore;
  messagesStore?: MessagesStore;
  listingsStore?: ListingsStore;
  findUser?: (id: string) => { id: string } | null;
  createId?: () => string;
};

const defaultConversationsStore = createConversationsStore(db);
const defaultMessagesStore = createMessagesStore(db);
const defaultListingsStore = createListingsStore(db);

function matchConversationId(url: URL) {
  return url.pathname.match(/^\/api\/conversations\/([^/]+)(?:\/messages)?$/)?.[1];
}

function isMember(conversation: { sender_id: string; recipient_id: string }, userId: string) {
  return conversation.sender_id === userId || conversation.recipient_id === userId;
}

function forbidden() {
  return json({ error: 'Forbidden' }, { status: 403 });
}

function validationError(error: z.ZodError): Response {
  return badRequest(error.issues[0]?.message ?? 'Invalid request');
}

/** Creates the handler that lists the authenticated user's inbox. */
export function createGetConversations({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getConversations(
    _: BunRequest<'/api/conversations'>,
    { auth }: RouteDependencies,
  ) {
    return json({ items: conversationsStore.listConversationsForUser(auth.userId) });
  };
}

/** Lists the authenticated user's inbox using application dependencies. */
export const getConversations = createGetConversations();

/** Creates the handler that counts unread conversations. */
export function createGetUnreadCount({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getUnreadCount(
    _: BunRequest<'/api/conversations/unread-count'>,
    { auth }: RouteDependencies,
  ) {
    return json({ count: conversationsStore.getUnreadConversationCount(auth.userId) });
  };
}

/** Counts unread conversations using application dependencies. */
export const getUnreadCount = createGetUnreadCount();

/** Creates the handler that returns a conversation and its messages. */
export function createGetConversationDetail({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
}: ConversationRouteOptions = {}) {
  return async function getConversationDetail(
    _: BunRequest<'/api/conversations/:id'>,
    { auth, url }: RouteDependencies,
  ) {
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

/** Returns a conversation and messages using application dependencies. */
export const getConversationDetail = createGetConversationDetail();

/** Creates the handler that starts a conversation and sends its first message. */
export function createPostConversation({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
  listingsStore = defaultListingsStore,
  findUser = findUserById,
  createId = () => randomToken(18),
}: ConversationRouteOptions = {}) {
  return async function postConversation(
    request: BunRequest<'/api/conversations'>,
    { auth }: RouteDependencies,
  ) {
    const parsed = createConversationSchema.safeParse(await readJson<unknown>(request));
    if (!parsed.success) return validationError(parsed.error);
    const body = parsed.data;

    if (body.recipient_id === auth.userId)
      return badRequest('Cannot start a conversation with yourself');
    if (!findUser(body.recipient_id)) return badRequest('recipient not found');

    const listingId = body.listing_id ?? null;
    if (listingId && !listingsStore.findListingByIdForUser(listingId, body.recipient_id)) {
      return badRequest('listing does not belong to the recipient');
    }

    const existing = listingId
      ? (conversationsStore.findExistingBetween(auth.userId, body.recipient_id, listingId)[0] ??
        null)
      : null;

    const conversation =
      existing ??
      conversationsStore.createConversation({
        id: createId(),
        sender_id: auth.userId,
        recipient_id: body.recipient_id,
        listing_id: listingId,
      });

    messagesStore.createMessage({
      id: createId(),
      conversation_id: conversation.id,
      sender_id: auth.userId,
      text: body.text,
    });

    return json({ item: conversation }, { status: existing ? 200 : 201 });
  };
}

/** Starts a conversation using application dependencies. */
export const postConversation = createPostConversation();

/** Creates the handler that sends a message in a conversation. */
export function createPostMessage({
  conversationsStore = defaultConversationsStore,
  messagesStore = defaultMessagesStore,
  createId = () => randomToken(18),
}: ConversationRouteOptions = {}) {
  return async function postMessage(
    request: BunRequest<'/api/conversations/:id/messages'>,
    { auth, url }: RouteDependencies,
  ) {
    const id = matchConversationId(url);
    if (!id) return badRequest('Invalid conversation ID');

    const parsed = createMessageSchema.safeParse(await readJson<unknown>(request));
    if (!parsed.success) return validationError(parsed.error);

    const conversation = conversationsStore.findConversationById(id);
    if (!conversation) return notFound('Conversation not found');
    if (!isMember(conversation, auth.userId)) return forbidden();

    const message = messagesStore.createMessage({
      id: createId(),
      conversation_id: id,
      sender_id: auth.userId,
      text: parsed.data.text,
    });

    return json({ item: message }, { status: 201 });
  };
}

/** Sends a conversation message using application dependencies. */
export const postMessage = createPostMessage();

/** Creates the handler that finds an existing listing conversation. */
export function createGetExistingConversations({
  conversationsStore = defaultConversationsStore,
}: ConversationRouteOptions = {}) {
  return async function getExistingConversations(
    _: BunRequest<'/api/conversations/existing'>,
    { auth, url }: RouteDependencies,
  ) {
    const parsed = existingConversationQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) return validationError(parsed.error);

    return json({
      items: conversationsStore.findExistingBetween(
        auth.userId,
        parsed.data.other_user_id,
        parsed.data.listing_id,
      ),
    });
  };
}

/** Finds existing listing conversations using application dependencies. */
export const getExistingConversations = createGetExistingConversations();
