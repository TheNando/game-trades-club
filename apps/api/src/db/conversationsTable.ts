import type { Database } from 'bun:sqlite';

/** Represents a persisted conversation between two users. */
export type ConversationRecord = {
  id: string;
  sender_id: string;
  recipient_id: string;
  listing_id: string | null;
  created_at: string;
  updated_at: string;
  sender_last_read_at: string;
  recipient_last_read_at: string;
};

/** Represents a conversation enriched for inbox display. */
export type ConversationListItem = ConversationRecord & {
  last_message_text: string | null;
  last_message_at: string | null;
  unread_count: number;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar_url: string | null;
  listing_game_name: string | null;
  listing_created_at: string | null;
};

/** Represents a conversation with its linked listing details. */
export type ConversationDetail = ConversationRecord & {
  listing_game_name: string | null;
  listing_created_at: string | null;
};

const conversationColumns =
  'id, sender_id, recipient_id, listing_id, created_at, updated_at, sender_last_read_at, recipient_last_read_at';

/** Creates database operations for user conversations. */
export function createConversationsStore(database: Database) {
  const findByIdStmt = database.query<ConversationRecord, [string]>(
    `SELECT ${conversationColumns} FROM conversations WHERE id = ?`,
  );

  const findDetailByIdStmt = database.query<ConversationDetail, [string]>(
    `SELECT c.id, c.sender_id, c.recipient_id, c.listing_id, c.created_at, c.updated_at,
            c.sender_last_read_at, c.recipient_last_read_at,
            g.name AS listing_game_name,
            l.created_at AS listing_created_at
     FROM conversations c
     LEFT JOIN listings l ON l.id = c.listing_id
     LEFT JOIN games g ON g.id = l.game_id
     WHERE c.id = ?`,
  );

  const createStmt = database.query(
    `INSERT INTO conversations (id, sender_id, recipient_id, listing_id)
     VALUES (?, ?, ?, ?)`,
  );

  const updateReadAtStmt = database.query(
    `UPDATE conversations
     SET sender_last_read_at = CASE WHEN sender_id = ? THEN CURRENT_TIMESTAMP ELSE sender_last_read_at END,
         recipient_last_read_at = CASE WHEN recipient_id = ? THEN CURRENT_TIMESTAMP ELSE recipient_last_read_at END,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
  );

  const findExistingStmt = database.query<
    ConversationRecord,
    [string, string, string, string, string]
  >(
    `SELECT ${conversationColumns}
     FROM conversations
     WHERE ((sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?))
       AND listing_id = ?
     ORDER BY created_at DESC`,
  );

  const listForUserStmt = database.query<
    ConversationListItem,
    [string, string, string, string, string, string]
  >(
    `SELECT
      c.*,
      m.text as last_message_text,
      m.created_at as last_message_at,
      (SELECT COUNT(*) FROM messages unread
       WHERE unread.conversation_id = c.id
         AND unread.sender_id != ?
         AND unread.created_at > (CASE WHEN c.sender_id = ? THEN c.sender_last_read_at ELSE c.recipient_last_read_at END)
      ) as unread_count,
      CASE WHEN c.sender_id = ? THEN c.recipient_id ELSE c.sender_id END as other_user_id,
      u.name as other_user_name,
      u.avatar_url as other_user_avatar_url,
      g.name as listing_game_name,
      l.created_at as listing_created_at
    FROM conversations c
    LEFT JOIN (
      SELECT conversation_id, text, created_at,
      ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at DESC) as rn
      FROM messages
    ) m ON m.conversation_id = c.id AND m.rn = 1
    JOIN users u ON u.id = (CASE WHEN c.sender_id = ? THEN c.recipient_id ELSE c.sender_id END)
    LEFT JOIN listings l ON l.id = c.listing_id
    LEFT JOIN games g ON g.id = l.game_id
    WHERE c.sender_id = ? OR c.recipient_id = ?
    ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
  );

  const unreadCountStmt = database.query<{ count: number; }, [string, string, string, string]>(
    `SELECT COUNT(*) as count
     FROM conversations c
     WHERE (c.sender_id = ? OR c.recipient_id = ?)
       AND EXISTS (
         SELECT 1 FROM messages m
         WHERE m.conversation_id = c.id
           AND m.sender_id != ?
           AND m.created_at > (CASE WHEN c.sender_id = ? THEN c.sender_last_read_at ELSE c.recipient_last_read_at END)
       )`,
  );

  return {
    findConversationById(id: string): ConversationRecord | null {
      return findByIdStmt.get(id) ?? null;
    },

    findConversationDetailById(id: string): ConversationDetail | null {
      return findDetailByIdStmt.get(id) ?? null;
    },

    createConversation(input: {
      id: string;
      sender_id: string;
      recipient_id: string;
      listing_id: string | null;
    }): ConversationRecord {
      createStmt.run(input.id, input.sender_id, input.recipient_id, input.listing_id);
      return findByIdStmt.get(input.id)!;
    },

    markAsRead(conversationId: string, userId: string): void {
      updateReadAtStmt.run(userId, userId, conversationId);
    },

    listConversationsForUser(userId: string): ConversationListItem[] {
      return listForUserStmt.all(userId, userId, userId, userId, userId, userId);
    },

    getUnreadConversationCount(userId: string): number {
      return unreadCountStmt.get(userId, userId, userId, userId)!.count;
    },

    findExistingBetween(user1: string, user2: string, listingId: string): ConversationRecord[] {
      return findExistingStmt.all(user1, user2, user2, user1, listingId);
    },
  };
}
