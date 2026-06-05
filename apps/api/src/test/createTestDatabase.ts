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

export function seedGame(database: Database, gameId = 1) {
  database
    .query(
      `INSERT OR IGNORE INTO games (id, name, year, is_expansion)
       VALUES (?, ?, ?, ?)`
    )
    .run(gameId, `Game ${gameId}`, 2024, 0);

  return { id: gameId };
}

export function seedListing(
  database: Database,
  {
    id = 'listing-1',
    userId = 'user-1',
    gameId = 1,
  }: { id?: string; userId?: string; gameId?: number; } = {}
) {
  seedGame(database, gameId);

  database
    .query(
      `INSERT INTO listings (id, user_id, description, game_id, condition, price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, userId, 'Seed listing', gameId, 'good', 20, 'open');

  return { id, user_id: userId };
}

export function seedListingImage(
  database: Database,
  {
    id = 'image-1',
    listingId = 'listing-1',
    ownerId = 'user-1',
    originalFilename = 'cover.png',
    storedFilename = 'cover.png',
    thumbStoredFilename = null,
    width = null,
    height = null,
    mimeType = 'image/png',
    createdAt,
  }: {
    id?: string;
    listingId?: string;
    ownerId?: string;
    originalFilename?: string;
    storedFilename?: string;
    thumbStoredFilename?: string | null;
    width?: number | null;
    height?: number | null;
    mimeType?: string;
    createdAt?: string;
  } = {}
) {
  if (createdAt) {
    database
      .query(
        `INSERT INTO listing_images (id, listing_id, owner_id, original_filename, stored_filename, thumb_stored_filename, width, height, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, listingId, ownerId, originalFilename, storedFilename, thumbStoredFilename, width, height, mimeType, createdAt);
  } else {
    database
      .query(
        `INSERT INTO listing_images (id, listing_id, owner_id, original_filename, stored_filename, thumb_stored_filename, width, height, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, listingId, ownerId, originalFilename, storedFilename, thumbStoredFilename, width, height, mimeType);
  }

  return { id, listing_id: listingId, owner_id: ownerId };
}
