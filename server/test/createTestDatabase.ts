import { Database } from 'bun:sqlite';

const schemaPath = new URL('../db/schema.sql', import.meta.url);

export async function createTestDatabase() {
  const database = new Database(':memory:', { create: true, strict: true });
  const schemaSql = await Bun.file(schemaPath).text();
  database.run(schemaSql);
  return database;
}

export function seedUser(database: Database, userId = 'user-1') {
  database
    .query(
      `INSERT INTO users (id, google_sub, email, name, avatar_url)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, `${userId}-google`, `${userId}@example.com`, 'Test User', null);

  return { id: userId };
}

export function seedListing(
  database: Database,
  {
    id = 'listing-1',
    userId = 'user-1',
    gameId = 1,
  }: { id?: string; userId?: string; gameId?: number } = {}
) {
  database
    .query(
      `INSERT INTO listings (id, user_id, description, game_id, condition, price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, userId, 'Seed listing', gameId, 'good', 20, 'open');

  return { id, user_id: userId };
}
