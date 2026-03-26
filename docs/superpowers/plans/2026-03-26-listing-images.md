# Listing Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add listing image uploads by creating the listing first, then uploading up to three images one at a time with progress, retry, and cancel support, while storing image metadata in SQLite and files on disk.

**Architecture:** Keep `listings` image-free and add a separate `listing_images` table plus a dedicated `POST /api/listing-images` upload route. Use small server-side factories for the listing and image stores so route logic can be tested against in-memory SQLite, and keep the client upload flow sequential so partial failures are explicit and retryable.

**Tech Stack:** Bun, Bun SQLite, Bun multipart `formData()`, Preact, Testing Library, Happy DOM

---

### Task 1: Clean up listing persistence and make it testable

**Files:**
- Modify: `package.json`
- Modify: `server/db/schema.sql`
- Modify: `server/db/listingsTable.ts`
- Modify: `server/routes/listings.ts`
- Create: `server/test/createTestDatabase.ts`
- Test: `server/routes/listings.test.ts`

- [ ] **Step 1: Write the failing test**

Add a basic Bun test script, add a temporary in-memory SQLite helper, and write tests that expect the new listing parser/store API to exist and to ignore abandoned image fields.

```json
{
  "scripts": {
    "dev": "bunx concurrently \"bun run server\" \"bun run client\"",
    "client": "vite -- --host 0.0.0.0",
    "server": "bun run server/index.ts",
    "preview": "vite preview",
    "test": "bun test"
  }
}
```

```ts
// server/test/createTestDatabase.ts
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
```

```ts
// server/routes/listings.test.ts
import { describe, expect, test } from 'bun:test';
import { createListingsStore } from '../db/listingsTable';
import { createTestDatabase, seedUser } from '../test/createTestDatabase';
import { parseCreateListingBody } from './listings';

describe('parseCreateListingBody', () => {
  test('ignores abandoned image fields', () => {
    const parsed = parseCreateListingBody({
      description: '  Complete in box  ',
      game_id: '42',
      condition: 'good',
      price: '25',
      status: 'open',
      image_ids: '[1,2,3]',
      image_url: 'https://example.com/full.png',
      image_thumbnail_url: 'https://example.com/thumb.png',
    } as never);

    expect(parsed).toEqual({
      description: 'Complete in box',
      game_id: 42,
      condition: 'good',
      price: 25,
      status: 'open',
    });
  });
});

describe('createListingsStore', () => {
  test('creates a listing without image columns', async () => {
    const database = await createTestDatabase();
    const user = seedUser(database);
    const listings = createListingsStore(database);

    const created = listings.createListing(user.id, {
      id: 'listing-1',
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });

    expect(created).toMatchObject({
      id: 'listing-1',
      user_id: user.id,
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });

    const row = database
      .query(
        `SELECT id, user_id, description, game_id, condition, price, status
         FROM listings
         WHERE id = ?`
      )
      .get('listing-1');

    expect(row).toEqual({
      id: 'listing-1',
      user_id: user.id,
      description: 'Near mint copy',
      game_id: 7,
      condition: 'like_new',
      price: 30,
      status: 'open',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test server/routes/listings.test.ts`

Expected: FAIL with missing exports such as `createListingsStore` / `parseCreateListingBody`, or with the old listing schema still referencing `image_ids`.

- [ ] **Step 3: Write minimal implementation**

Remove `image_ids` from the `listings` schema, convert `server/db/listingsTable.ts` into a store factory with default exports for production, and update `server/routes/listings.ts` so listing creation only handles listing fields.

```sql
-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT,
  game_id INTEGER NOT NULL,
  condition TEXT NOT NULL,
  price INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

```ts
// server/db/listingsTable.ts
import type { Database } from 'bun:sqlite';
import { db } from './client';

export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  created_at: string;
  updated_at: string;
};

type CreateListingInput = {
  id: string;
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
};

type UpdateListingInput = {
  description?: string | null;
  game_id?: number;
  condition?: string;
  price?: number;
  status?: 'open' | 'pending' | 'complete';
};

export function createListingsStore(database: Database) {
  const listStmt = database.query<Listing, [string]>(
    `SELECT id, user_id, description, game_id, condition, price, status, created_at, updated_at
     FROM listings
     WHERE user_id = ?
     ORDER BY created_at DESC`
  );

  const findStmt = database.query<Listing, [string, string]>(
    `SELECT id, user_id, description, game_id, condition, price, status, created_at, updated_at
     FROM listings
     WHERE id = ? AND user_id = ?`
  );

  const createStmt = database.query(
    `INSERT INTO listings (
       id,
       user_id,
       description,
       game_id,
       condition,
       price,
       status
     )
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const updateStmt = database.query(
    `UPDATE listings
     SET description = COALESCE(?, description),
         game_id = COALESCE(?, game_id),
         condition = COALESCE(?, condition),
         price = COALESCE(?, price),
         status = COALESCE(?, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  );

  const deleteStmt = database.query(`DELETE FROM listings WHERE id = ? AND user_id = ?`);

  return {
    listListingsByUser(userId: string) {
      return listStmt.all(userId);
    },
    findListingByIdForUser(listingId: string, userId: string) {
      return findStmt.get(listingId, userId) ?? null;
    },
    createListing(userId: string, input: CreateListingInput) {
      createStmt.run(
        input.id,
        userId,
        input.description,
        input.game_id,
        input.condition,
        input.price,
        input.status
      );

      return findStmt.get(input.id, userId)!;
    },
    updateListing(userId: string, listingId: string, input: UpdateListingInput) {
      const result = updateStmt.run(
        input.description ?? null,
        input.game_id ?? null,
        input.condition ?? null,
        input.price ?? null,
        input.status ?? null,
        listingId,
        userId
      );

      return Number(result.changes) > 0;
    },
    removeListing(userId: string, listingId: string) {
      const result = deleteStmt.run(listingId, userId);
      return Number(result.changes) > 0;
    },
  };
}

const listingsStore = createListingsStore(db);

export const {
  createListing,
  findListingByIdForUser,
  listListingsByUser,
  removeListing,
  updateListing,
} = listingsStore;
```

```ts
// server/routes/listings.ts
type ListingBody = {
  description?: string;
  game_id?: string | number;
  condition?: string;
  price?: string | number;
  status?: 'open' | 'pending' | 'complete';
  image_ids?: string;
  image_url?: string;
  image_thumbnail_url?: string;
};

type ParsedCreateListingBody = {
  description: string | null;
  game_id: number;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
};

export function parseCreateListingBody(body: ListingBody | null): ParsedCreateListingBody | Response {
  if (!body?.condition) return badRequest('condition is required');
  if (!body?.status) return badRequest('status is required');

  const gameId = parseIntegerField(body.game_id, 'game_id');
  if (gameId instanceof Response) return gameId;
  if (gameId === null) return badRequest('game_id is required');
  if (gameId <= 0) return badRequest('game_id must be greater than zero');

  const price = parseIntegerField(body.price, 'price');
  if (price instanceof Response) return price;
  if (price === null) return badRequest('price is required');
  if (price < 0) return badRequest('price must be zero or greater');

  return {
    description: normalizeOptionalText(body.description),
    game_id: gameId,
    condition: body.condition,
    price,
    status: body.status,
  };
}

export async function postListing(
  request: BunRequest<'/api/listings'>,
  { auth }: RouteDependencies
) {
  const parsed = parseCreateListingBody(await readJson<ListingBody>(request));
  if (parsed instanceof Response) return parsed;

  const listing = createListing(auth.userId, {
    id: randomToken(18),
    ...parsed,
  });

  return json({ item: listing }, { status: 201 });
}

export async function patchListing(
  request: BunRequest<'/api/listings'>,
  { auth, url }: RouteDependencies
) {
  const listingId = matchListingId(url);
  if (!listingId) return badRequest('Invalid listing ID');

  const body = await readJson<ListingBody>(request);
  if (!body) return badRequest('Invalid JSON body');

  const gameId = parseIntegerField(body.game_id, 'game_id');
  if (gameId instanceof Response) return gameId;
  if (gameId !== null && gameId <= 0) return badRequest('game_id must be greater than zero');

  const price = parseIntegerField(body.price, 'price');
  if (price instanceof Response) return price;
  if (price !== null && price < 0) return badRequest('price must be zero or greater');

  const updated = updateListing(auth.userId, listingId, {
    description: body.description === undefined ? undefined : normalizeOptionalText(body.description),
    game_id: gameId ?? undefined,
    condition: body.condition,
    price: price ?? undefined,
    status: body.status,
  });

  return updated ? new Response(null, { status: 204 }) : notFound();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test server/routes/listings.test.ts`

Expected: PASS with both listing parser/store tests green.

- [ ] **Step 5: Commit**

```bash
git add package.json server/db/schema.sql server/db/listingsTable.ts server/routes/listings.ts server/test/createTestDatabase.ts server/routes/listings.test.ts
git commit -m "refactor: clean up listing persistence for image uploads"
```

### Task 2: Add image storage, image records, and the upload route

**Files:**
- Modify: `server/db/schema.sql`
- Modify: `server/index.ts`
- Create: `server/db/listingImagesTable.ts`
- Create: `server/storage/listingImageStorage.ts`
- Create: `server/routes/listingImages.ts`
- Modify: `server/test/createTestDatabase.ts`
- Test: `server/routes/listingImages.test.ts`

- [ ] **Step 1: Write the failing test**

Write the upload route tests first, including success, no-file, too-many-files, wrong-owner, and cleanup-on-insert-failure coverage.

```ts
// server/test/createTestDatabase.ts
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
```

```ts
// server/routes/listingImages.test.ts
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createListingsStore } from '../db/listingsTable';
import { createListingImagesStore } from '../db/listingImagesTable';
import { createTestDatabase, seedListing, seedUser } from '../test/createTestDatabase';
import { createPostListingImage } from './listingImages';

async function createUploadDir() {
  return mkdtemp(join(tmpdir(), 'listing-images-'));
}

function createImageRequest(listingId: string, files: File[]) {
  const formData = new FormData();
  formData.set('listing_id', listingId);

  for (const file of files) {
    formData.append('image', file);
  }

  const request = new Request('http://example.test/api/listing-images', {
    method: 'POST',
    body: formData,
  });

  return {
    request,
    deps: {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url: new URL(request.url),
    },
  };
}

describe('createPostListingImage', () => {
  test('rejects requests with no image file', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const request = new Request('http://example.test/api/listing-images', {
      method: 'POST',
      body: new FormData(),
    });

    const response = await handler(request as never, {
      auth: { userId: 'user-1', sessionId: 'session-1' },
      url: new URL(request.url),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'image is required' });

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('rejects requests with more than one image file', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const files = [
      new File(['a'], 'front.png', { type: 'image/png' }),
      new File(['b'], 'back.png', { type: 'image/png' }),
    ];
    const { request, deps } = createImageRequest('listing-1', files);
    const response = await handler(request as never, deps);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Only one image may be uploaded at a time',
    });

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('stores one image with a guid filename and original extension', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const listingsStore = createListingsStore(database);
    const listingImagesStore = createListingImagesStore(database);
    const handler = createPostListingImage({
      listingsStore,
      listingImagesStore,
      uploadDir,
    });

    const { request, deps } = createImageRequest('listing-1', [
      new File(['jpeg-data'], 'cover.JPG', { type: 'image/jpeg' }),
    ]);
    const response = await handler(request as never, deps);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.item.listing_id).toBe('listing-1');
    expect(body.item.owner_id).toBe('user-1');
    expect(body.item.original_filename).toBe('cover.JPG');
    expect(body.item.stored_filename).toEndWith('.jpg');

    const savedFiles = await readdir(uploadDir);
    expect(savedFiles).toHaveLength(1);
    expect(savedFiles[0]).toBe(body.item.stored_filename);

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('returns not found when the listing belongs to another user', async () => {
    const database = await createTestDatabase();
    seedUser(database, 'user-1');
    seedUser(database, 'user-2');
    seedListing(database, { userId: 'user-2' });
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = createImageRequest('listing-1', [
      new File(['png-data'], 'cover.png', { type: 'image/png' }),
    ]);
    const response = await handler(request as never, deps);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Listing not found' });

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('removes the saved file if image record insertion fails', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: {
        createListingImage() {
          throw new Error('insert failed');
        },
      } as never,
      uploadDir,
    });

    const { request, deps } = createImageRequest('listing-1', [
      new File(['png-data'], 'cover.png', { type: 'image/png' }),
    ]);
    const response = await handler(request as never, deps);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Unable to save image' });
    expect(await readdir(uploadDir)).toEqual([]);

    await rm(uploadDir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test server/routes/listingImages.test.ts`

Expected: FAIL because `server/db/listingImagesTable.ts` and `server/routes/listingImages.ts` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add the new table and indexes, implement the image record store, add a tiny storage helper around local file writes, and expose the authenticated upload route.

```sql
-- server/db/schema.sql
CREATE TABLE IF NOT EXISTS listing_images (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_images_owner_id ON listing_images(owner_id);
```

```ts
// server/db/listingImagesTable.ts
import type { Database } from 'bun:sqlite';
import { db } from './client';

export type ListingImage = {
  id: string;
  listing_id: string;
  owner_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  created_at: string;
};

type CreateListingImageInput = {
  id: string;
  listing_id: string;
  owner_id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
};

export function createListingImagesStore(database: Database) {
  const createStmt = database.query(
    `INSERT INTO listing_images (
       id,
       listing_id,
       owner_id,
       original_filename,
       stored_filename,
       mime_type
     )
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const findStmt = database.query<ListingImage, [string]>(
    `SELECT id, listing_id, owner_id, original_filename, stored_filename, mime_type, created_at
     FROM listing_images
     WHERE id = ?`
  );

  return {
    createListingImage(input: CreateListingImageInput) {
      createStmt.run(
        input.id,
        input.listing_id,
        input.owner_id,
        input.original_filename,
        input.stored_filename,
        input.mime_type
      );

      return findStmt.get(input.id)!;
    },
  };
}

const listingImagesStore = createListingImagesStore(db);

export const { createListingImage } = listingImagesStore;
```

```ts
// server/storage/listingImageStorage.ts
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const allowedImageTypes = new Map<string, string>([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export function isSupportedListingImage(file: File) {
  return allowedImageTypes.has(file.type);
}

export function getListingImageUploadDir() {
  return process.env.LISTING_IMAGE_UPLOAD_DIR ?? './data/listing-images';
}

export async function saveListingImage(uploadDir: string, file: File) {
  const extension = allowedImageTypes.get(file.type);
  if (!extension) throw new Error('Unsupported image type');

  const storedFilename = `${crypto.randomUUID()}${extension}`;
  await mkdir(uploadDir, { recursive: true });
  const absolutePath = join(uploadDir, storedFilename);
  await Bun.write(absolutePath, file);

  return {
    absolutePath,
    storedFilename,
    originalFilename: file.name,
    mimeType: file.type,
  };
}

export async function removeListingImageFile(absolutePath: string) {
  await rm(absolutePath, { force: true });
}
```

```ts
// server/routes/listingImages.ts
import { BunRequest } from 'bun';
import { createListingImage, createListingImagesStore } from '../db/listingImagesTable';
import { createListingsStore, findListingByIdForUser } from '../db/listingsTable';
import { db } from '../db/client';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, serverError } from '../utils/http';
import { saveListingImage, removeListingImageFile, isSupportedListingImage, getListingImageUploadDir } from '../storage/listingImageStorage';

type ListingImageRouteDeps = {
  listingsStore?: Pick<ReturnType<typeof createListingsStore>, 'findListingByIdForUser'>;
  listingImagesStore?: Pick<ReturnType<typeof createListingImagesStore>, 'createListingImage'>;
  uploadDir?: string;
};

const defaultListingsStore = createListingsStore(db);
const defaultListingImagesStore = createListingImagesStore(db);

export function createPostListingImage({
  listingsStore = defaultListingsStore,
  listingImagesStore = defaultListingImagesStore,
  uploadDir = getListingImageUploadDir(),
}: ListingImageRouteDeps = {}) {
  return async function postListingImage(
    request: BunRequest<'/api/listing-images'>,
    { auth }: RouteDependencies
  ) {
    const formData = await request.formData();
    const listingId = formData.get('listing_id');

    if (typeof listingId !== 'string' || listingId.trim() === '') {
      return badRequest('listing_id is required');
    }

    const files = formData
      .getAll('image')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) return badRequest('image is required');
    if (files.length > 1) return badRequest('Only one image may be uploaded at a time');

    const file = files[0];
    if (!isSupportedListingImage(file)) return badRequest('Unsupported image type');

    const listing = listingsStore.findListingByIdForUser(listingId, auth.userId);
    if (!listing) return notFound('Listing not found');

    const savedFile = await saveListingImage(uploadDir, file);

    try {
      const item = listingImagesStore.createListingImage({
        id: crypto.randomUUID(),
        listing_id: listing.id,
        owner_id: auth.userId,
        original_filename: savedFile.originalFilename,
        stored_filename: savedFile.storedFilename,
        mime_type: savedFile.mimeType,
      });

      return json({ item }, { status: 201 });
    } catch {
      await removeListingImageFile(savedFile.absolutePath);
      return serverError('Unable to save image');
    }
  };
}

export const postListingImage = createPostListingImage();
```

```ts
// server/index.ts
import { postListingImage } from './routes/listingImages';

Bun.serve({
  port,
  routes: {
    "/api/listing-images": {
      POST: withDeps(postListingImage),
    },
    "/api/listings": {
      DELETE: withDeps(deleteListing),
      GET: withDeps(getListings),
      PATCH: withDeps(patchListing),
      POST: withDeps(postListing),
    },
  },
  fetch() {
    return json({ error: 'Not found' }, { status: 404 });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test server/routes/listingImages.test.ts`

Expected: PASS with all upload route tests green.

- [ ] **Step 5: Commit**

```bash
git add server/db/schema.sql server/index.ts server/db/listingImagesTable.ts server/storage/listingImageStorage.ts server/routes/listingImages.ts server/test/createTestDatabase.ts server/routes/listingImages.test.ts
git commit -m "feat: add listing image upload resource"
```

### Task 3: Add client-side image selection, upload progress, retry, and cancel

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/pages/addListing.tsx`
- Create: `test/setup.ts`
- Create: `src/pages/addListingUploads.ts`
- Test: `src/pages/addListingUploads.test.ts`
- Test: `src/pages/addListing.test.tsx`

- [ ] **Step 1: Write the failing test**

Install the DOM-testing dependencies, preload Happy DOM, add queue helper tests, and add one component test that exercises validation plus the partial-failure UI state.

Run: `bun add -d @happy-dom/global-registrator @testing-library/jest-dom @testing-library/preact @testing-library/user-event`

```json
{
  "scripts": {
    "dev": "bunx concurrently \"bun run server\" \"bun run client\"",
    "client": "vite -- --host 0.0.0.0",
    "server": "bun run server/index.ts",
    "preview": "vite preview",
    "test": "bun test --preload ./test/setup.ts"
  }
}
```

```ts
// test/setup.ts
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import '@testing-library/jest-dom';

GlobalRegistrator.register();
```

```ts
// src/pages/addListingUploads.test.ts
import { describe, expect, mock, test } from 'bun:test';
import { cancelPendingUploads, createUploadItems, runUploadQueue, validateSelectedImages } from './addListingUploads';

describe('validateSelectedImages', () => {
  test('rejects more than three files', () => {
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
      new File(['4'], 'four.png', { type: 'image/png' }),
    ];

    expect(validateSelectedImages(files)).toEqual({
      ok: false,
      message: 'You can upload up to 3 images.',
    });
  });

  test('rejects unsupported file types', () => {
    const files = [new File(['gif'], 'cover.gif', { type: 'image/gif' })];

    expect(validateSelectedImages(files)).toEqual({
      ok: false,
      message: 'Images must be webp, png, or jpg.',
    });
  });
});

describe('runUploadQueue', () => {
  test('uploads sequentially and stops on the first failure', async () => {
    const calls: string[] = [];
    const items = createUploadItems([
      new File(['1'], 'front.png', { type: 'image/png' }),
      new File(['2'], 'back.png', { type: 'image/png' }),
      new File(['3'], 'box.png', { type: 'image/png' }),
    ]);

    const result = await runUploadQueue({
      items,
      listingId: 'listing-1',
      uploadImage: mock(async ({ file }) => {
        calls.push(file.name);
        if (file.name === 'back.png') {
          throw new Error('Unable to upload image.');
        }
      }),
    });

    expect(calls).toEqual(['front.png', 'back.png']);
    expect(result.map((item) => item.status)).toEqual(['uploaded', 'failed', 'pending']);
  });

  test('marks remaining pending items as cancelled', () => {
    const items = createUploadItems([
      new File(['1'], 'front.png', { type: 'image/png' }),
      new File(['2'], 'back.png', { type: 'image/png' }),
    ]);
    items[0] = { ...items[0], status: 'uploaded' };

    expect(cancelPendingUploads(items).map((item) => item.status)).toEqual([
      'uploaded',
      'cancelled',
    ]);
  });
});
```

```tsx
// src/pages/addListing.test.tsx
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { AddListing } from './addListing';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('<AddListing />', () => {
  beforeEach(() => {
    let uploadAttempts = 0;

    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();

      if (url === '/api/me') {
        return jsonResponse({
          id: 'user-1',
          email: 'user@example.com',
          name: 'User',
          avatarUrl: null,
        });
      }

      if (url.startsWith('/api/games')) {
        return jsonResponse({
          items: [{ id: 1, name: 'Catan', year: 1995 }],
        });
      }

      if (url === '/api/listings') {
        return jsonResponse({
          item: {
            id: 'listing-1',
            user_id: 'user-1',
            description: 'Nice copy',
            game_id: 1,
            condition: 'good',
            price: 25,
            status: 'open',
          },
        }, { status: 201 });
      }

      if (url === '/api/listing-images') {
        uploadAttempts += 1;

        if (uploadAttempts === 1) {
          return jsonResponse({
            item: {
              id: 'image-1',
              listing_id: 'listing-1',
              owner_id: 'user-1',
              original_filename: 'front.png',
              stored_filename: 'guid-front.png',
              mime_type: 'image/png',
              created_at: '2026-03-26 00:00:00',
            },
          }, { status: 201 });
        }

        return jsonResponse({ error: 'Unable to upload image.' }, { status: 500 });
      }

      throw new Error(`Unhandled fetch: ${url}`);
    }) as never;
  });

  afterEach(() => {
    cleanup();
  });

  test('shows a validation error when more than three files are selected', async () => {
    render(<AddListing />);
    await screen.findByText('Add A Listing');

    const input = screen.getByLabelText('Images') as HTMLInputElement;
    const files = [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
      new File(['3'], 'three.png', { type: 'image/png' }),
      new File(['4'], 'four.png', { type: 'image/png' }),
    ];

    fireEvent.change(input, { target: { files } });

    expect(screen.getByText('You can upload up to 3 images.')).toBeInTheDocument();
  });

  test('creates the listing before uploading images and exposes retry/cancel controls after a partial failure', async () => {
    render(<AddListing />);
    await screen.findByText('Add A Listing');

    fireEvent.input(screen.getByLabelText('Game'), { target: { value: 'Catan' } });
    await waitFor(() => {
      expect(screen.getByText('Search and choose one result.')).toBeInTheDocument();
    });
    fireEvent.input(screen.getByLabelText('Game'), { target: { value: '1' } });
    fireEvent.input(screen.getByLabelText('Price ($)'), { target: { value: '25' } });

    const fileInput = screen.getByLabelText('Images') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: {
        files: [
          new File(['front'], 'front.png', { type: 'image/png' }),
          new File(['back'], 'back.png', { type: 'image/png' }),
        ],
      },
    });

    fireEvent.submit(screen.getByRole('button', { name: 'Publish listing' }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('1 of 2 uploaded')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry failed uploads' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel remaining uploads' })).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test --preload ./test/setup.ts src/pages/addListingUploads.test.ts src/pages/addListing.test.tsx`

Expected: FAIL because `src/pages/addListingUploads.ts` does not exist and the page does not yet render an `Images` field or upload status UI.

- [ ] **Step 3: Write minimal implementation**

Create a small upload-queue helper module, then refactor the page to use it for file validation, listing-first submission, sequential uploads, progress display, retry, and cancel.

```ts
// src/pages/addListingUploads.ts
export type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'cancelled';

export type UploadItem = {
  file: File;
  status: UploadStatus;
  error: string | null;
};

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateSelectedImages(files: File[]) {
  if (files.length > 3) {
    return { ok: false as const, message: 'You can upload up to 3 images.' };
  }

  if (files.some((file) => !allowedImageTypes.has(file.type))) {
    return { ok: false as const, message: 'Images must be webp, png, or jpg.' };
  }

  return { ok: true as const };
}

export function createUploadItems(files: File[]): UploadItem[] {
  return files.map((file) => ({
    file,
    status: 'pending',
    error: null,
  }));
}

export async function runUploadQueue({
  items,
  listingId,
  uploadImage,
  onItemsChange,
}: {
  items: UploadItem[];
  listingId: string;
  uploadImage: (args: { listingId: string; file: File }) => Promise<void>;
  onItemsChange?: (items: UploadItem[]) => void;
}) {
  const nextItems = [...items];

  for (let index = 0; index < nextItems.length; index += 1) {
    const current = nextItems[index];
    if (current.status !== 'pending' && current.status !== 'failed') continue;

    nextItems[index] = { ...current, status: 'uploading', error: null };
    onItemsChange?.([...nextItems]);

    try {
      await uploadImage({ listingId, file: current.file });
      nextItems[index] = { ...nextItems[index], status: 'uploaded' };
      onItemsChange?.([...nextItems]);
    } catch (error) {
      nextItems[index] = {
        ...nextItems[index],
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unable to upload image.',
      };
      onItemsChange?.([...nextItems]);
      break;
    }
  }

  return nextItems;
}

export function cancelPendingUploads(items: UploadItem[]) {
  return items.map((item) =>
    item.status === 'pending' ? { ...item, status: 'cancelled' as const } : item
  );
}
```

```tsx
// src/pages/addListing.tsx
import { useEffect, useState } from 'preact/hooks';
import {
  cancelPendingUploads,
  createUploadItems,
  runUploadQueue,
  type UploadItem,
  validateSelectedImages,
} from './addListingUploads';

type ListingResponse = {
  item: {
    id: string;
  };
};

async function uploadListingImage(listingId: string, file: File) {
  const formData = new FormData();
  formData.set('listing_id', listingId);
  formData.append('image', file);

  const response = await fetch('/api/listing-images', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (response.status === 401) {
    throw new Error('You must sign in before uploading images.');
  }

  if (!response.ok) {
    try {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? 'Unable to upload image.');
    } catch {
      throw new Error('Unable to upload image.');
    }
  }
}

export function AddListing() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [creatingListing, setCreatingListing] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const uploadedCount = uploadItems.filter((item) => item.status === 'uploaded').length;
  const totalUploads = uploadItems.length;
  const hasFailedUpload = uploadItems.some((item) => item.status === 'failed');

  const resetForm = () => {
    setDescription('');
    setCondition('good');
    setPrice('');
    setGameQuery('');
    setSelectedGame(null);
    setGameResults([]);
    setSelectedFiles([]);
    setUploadItems([]);
    setCreatedListingId(null);
  };

  const handleFileChange = (event: Event) => {
    const files = Array.from((event.currentTarget as HTMLInputElement).files ?? []);
    const validation = validateSelectedImages(files);

    if (!validation.ok) {
      setSelectedFiles([]);
      setUploadItems([]);
      setSubmitError(validation.message);
      return;
    }

    setSubmitError('');
    setSelectedFiles(files);
    setUploadItems(createUploadItems(files));
  };

  const submitListing = async (event: Event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedGame) {
      setSubmitError('Select a game from the search results first.');
      return;
    }

    const normalizedPrice = price.trim();
    if (!/^\d+$/.test(normalizedPrice)) {
      setSubmitError('Enter price in dollars.');
      return;
    }

    const validation = validateSelectedImages(selectedFiles);
    if (!validation.ok) {
      setSubmitError(validation.message);
      return;
    }

    setCreatingListing(true);

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          game_id: String(selectedGame.id),
          condition,
          price: normalizedPrice,
          status: 'open',
        }),
      });

      if (response.status === 401) {
        setUser(null);
        setSubmitError('You must sign in before creating a listing.');
        return;
      }

      if (!response.ok) {
        try {
          const errorBody = (await response.json()) as { error?: string };
          setSubmitError(errorBody.error ?? 'Unable to create listing.');
        } catch {
          setSubmitError('Unable to create listing.');
        }
        return;
      }

      const body = (await response.json()) as ListingResponse;
      setCreatedListingId(body.item.id);

      if (selectedFiles.length === 0) {
        resetForm();
        setSubmitSuccess('Listing created successfully.');
        return;
      }

      setUploadingImages(true);
      const result = await runUploadQueue({
        items: createUploadItems(selectedFiles),
        listingId: body.item.id,
        uploadImage: ({ listingId, file }) => uploadListingImage(listingId, file),
        onItemsChange: setUploadItems,
      });

      setUploadItems(result);

      if (result.some((item) => item.status === 'failed')) {
        setSubmitError('Listing created. Some images still need attention.');
        return;
      }

      resetForm();
      setSubmitSuccess('Listing and images created successfully.');
    } catch {
      setSubmitError('Unable to create listing.');
    } finally {
      setCreatingListing(false);
      setUploadingImages(false);
    }
  };

  const retryFailedUploads = async () => {
    if (!createdListingId) return;

    setSubmitError('');
    setUploadingImages(true);

    try {
      const result = await runUploadQueue({
        items: uploadItems,
        listingId: createdListingId,
        uploadImage: ({ listingId, file }) => uploadListingImage(listingId, file),
        onItemsChange: setUploadItems,
      });

      setUploadItems(result);

      if (result.some((item) => item.status === 'failed')) {
        setSubmitError('Listing created. Some images still need attention.');
        return;
      }

      resetForm();
      setSubmitSuccess('Listing and images created successfully.');
    } finally {
      setUploadingImages(false);
    }
  };

  const cancelRemainingUploads = () => {
    setUploadItems((items) => cancelPendingUploads(items));
    setSubmitError('');
    setSubmitSuccess('Listing created. Remaining image uploads cancelled.');
  };

  return (
    <form class="card bg-base-200 shadow-md" onSubmit={submitListing}>
      <div class="card-body gap-4">
        <fieldset class="fieldset">
          <label class="fieldset-label" for="listing-game">Game</label>
          <input
            id="listing-game"
            aria-label="Game"
            list="game-list"
            class="input input-bordered"
            type="text"
            required
            placeholder="Search game names (min 2 characters)"
            value={selectedGame ? formatGameLabel(selectedGame) : gameQuery}
            onInput={(event) => {
              const nextValue = (event.currentTarget as HTMLInputElement).value;
              const gameId = Number.parseInt(nextValue, 10);
              const game = gameResults.find((item) => item.id === gameId);

              if (game) {
                selectGame(game);
                return;
              }

              setGameQuery(nextValue);
              setSelectedGame(null);
            }}
          />
          <datalist id="game-list">
            {gameResults.map((game) => (
              <option key={game.id} value={game.id} label={formatGameLabel(game)} />
            ))}
          </datalist>

          <label class="fieldset-label" for="listing-condition">Condition</label>
          <select
            id="listing-condition"
            aria-label="Condition"
            class="select select-bordered"
            value={condition}
            onInput={(event) =>
              setCondition((event.currentTarget as HTMLSelectElement).value)
            }
          >
            <option value="new">New</option>
            <option value="like_new">Like New</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
          </select>

          <label class="fieldset-label" for="listing-price">Price ($)</label>
          <input
            id="listing-price"
            aria-label="Price ($)"
            class="input input-bordered"
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            required
            placeholder="25"
            value={price}
            onInput={(event) =>
              setPrice((event.currentTarget as HTMLInputElement).value)
            }
          />

          <label class="fieldset-label" for="listing-description">Description</label>
          <textarea
            id="listing-description"
            class="textarea textarea-bordered min-h-32"
            maxLength={1200}
            placeholder="Include box condition, missing pieces, edition notes, and meetup preferences."
            value={description}
            onInput={(event) =>
              setDescription((event.currentTarget as HTMLTextAreaElement).value)
            }
          />

          <label class="fieldset-label" for="listing-images">Images</label>
          <input
            id="listing-images"
            aria-label="Images"
            class="file-input file-input-bordered"
            type="file"
            accept=".webp,.png,.jpg,.jpeg,image/webp,image/png,image/jpeg"
            multiple
            onChange={handleFileChange}
          />
          <p class="label">Add up to 3 images in webp, png, or jpg format.</p>
        </fieldset>

        {creatingListing ? <div class="alert"><span>Creating listing...</span></div> : null}

        {totalUploads > 0 ? (
          <div class="card bg-base-100 shadow-sm">
            <div class="card-body gap-2">
              <h3 class="font-semibold">Image uploads</h3>
              <p>{uploadedCount} of {totalUploads} uploaded</p>
              <ul class="space-y-2">
                {uploadItems.map((item) => (
                  <li key={item.file.name} class="flex items-center justify-between gap-3">
                    <span>{item.file.name}</span>
                    <span>{item.status}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {hasFailedUpload ? (
          <div class="card-actions justify-end">
            <button type="button" class="btn btn-outline" onClick={retryFailedUploads} disabled={uploadingImages}>
              Retry failed uploads
            </button>
            <button type="button" class="btn btn-ghost" onClick={cancelRemainingUploads} disabled={uploadingImages}>
              Cancel remaining uploads
            </button>
          </div>
        ) : null}

        <div class="card-actions justify-end">
          <button type="submit" class="btn btn-primary" disabled={creatingListing || uploadingImages}>
            {creatingListing || uploadingImages ? 'Publishing...' : 'Publish listing'}
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test --preload ./test/setup.ts src/pages/addListingUploads.test.ts src/pages/addListing.test.tsx`

Expected: PASS with queue helper and Add Listing UI tests green.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock test/setup.ts src/pages/addListingUploads.ts src/pages/addListingUploads.test.ts src/pages/addListing.tsx src/pages/addListing.test.tsx
git commit -m "feat: add listing image uploads to add listing page"
```

### Task 4: Run full verification before wrapping the feature

**Files:**
- Modify: `src/pages/addListing.tsx`
- Modify: `server/routes/listingImages.ts`
- Modify: `server/routes/listings.ts`
- Modify: `server/db/listingsTable.ts`
- Modify: `server/db/listingImagesTable.ts`
- Modify: `server/storage/listingImageStorage.ts`
- Test: `server/routes/listings.test.ts`
- Test: `server/routes/listingImages.test.ts`
- Test: `src/pages/addListingUploads.test.ts`
- Test: `src/pages/addListing.test.tsx`

- [ ] **Step 1: Run the full test suite**

Run: `bun test --preload ./test/setup.ts`

Expected: PASS with all server and client tests green.

- [ ] **Step 2: Run a type-focused verification pass**

Run: `bunx tsc --noEmit`

Expected: PASS with no TypeScript errors in the touched client files and no syntax errors in server files.

- [ ] **Step 3: Smoke-test the server locally**

Run: `bun run server`

Expected: Server starts and logs `API server listening on http://localhost:3000`

- [ ] **Step 4: Smoke-test the client locally**

Run: `bun run client`

Expected: Vite starts successfully and the Add Listing page loads with the new file input.

- [ ] **Step 5: Commit**

```bash
git add src/pages/addListing.tsx server/routes/listingImages.ts server/routes/listings.ts server/db/listingsTable.ts server/db/listingImagesTable.ts server/storage/listingImageStorage.ts server/routes/listings.test.ts server/routes/listingImages.test.ts src/pages/addListingUploads.test.ts src/pages/addListing.test.tsx
git commit -m "test: verify listing image upload flow"
```
