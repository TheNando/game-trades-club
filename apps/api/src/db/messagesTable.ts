import type { Database } from 'bun:sqlite';

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

export type MessageWithSender = MessageRecord & {
  sender_name: string | null;
  sender_avatar_url: string | null;
};

const messageColumns = 'id, conversation_id, sender_id, text, created_at';

export function createMessagesStore(database: Database) {
  const listByConversationStmt = database.query<MessageWithSender, [string]>(
    `SELECT messages.id, messages.conversation_id, messages.sender_id, messages.text, messages.created_at,
            users.name AS sender_name,
            users.avatar_url AS sender_avatar_url
     FROM messages
     JOIN users ON users.id = messages.sender_id
     WHERE messages.conversation_id = ?
     ORDER BY messages.created_at ASC`
  );

  const createStmt = database.query(
    `INSERT INTO messages (id, conversation_id, sender_id, text)
     VALUES (?, ?, ?, ?)`
  );

  const findByIdStmt = database.query<MessageRecord, [string]>(
    `SELECT ${messageColumns} FROM messages WHERE id = ?`
  );

  return {
    listMessagesByConversation(conversationId: string): MessageWithSender[] {
      return listByConversationStmt.all(conversationId);
    },

    createMessage(input: { id: string; conversation_id: string; sender_id: string; text: string; }): MessageRecord {
      createStmt.run(input.id, input.conversation_id, input.sender_id, input.text);

      // Update the conversation's updated_at and sender/recipient_last_read_at
      database.run(
        `UPDATE conversations
         SET updated_at = CURRENT_TIMESTAMP,
             sender_last_read_at = CASE WHEN sender_id = ? THEN CURRENT_TIMESTAMP ELSE sender_last_read_at END,
             recipient_last_read_at = CASE WHEN recipient_id = ? THEN CURRENT_TIMESTAMP ELSE recipient_last_read_at END
         WHERE id = ?`,
        [input.sender_id, input.sender_id, input.conversation_id]
      );

      return findByIdStmt.get(input.id)!;
    }
  };
}
