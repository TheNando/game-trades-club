import { describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createListingImagesStore } from '../db/listingImagesTable';
import { createListingsStore } from '../db/listingsTable';
import {
  createTestDatabase,
  seedListing,
  seedListingImage,
  seedUser,
} from '../test/createTestDatabase';
import { createGetListingImage, createPostListingImage } from './listingImages';

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

  test('rejects image collections above the listing image limit', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });
    const files = Array.from(
      { length: 4 },
      (_, index) => new File(['a'], `image-${index}.png`, { type: 'image/png' }),
    );
    const { request, deps } = createImageRequest('listing-1', files);
    const response = await handler(request as never, deps);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'You can upload up to 3 images.' });
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
    const body = (await response.json()) as {
      item: {
        listing_id: string;
        owner_id: string;
        original_filename: string;
        stored_filename: string;
      };
    };

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

  test('rejects unsupported image types', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    const uploadDir = await createUploadDir();
    const handler = createPostListingImage({
      listingsStore: createListingsStore(database),
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = createImageRequest('listing-1', [
      new File(['gif-data'], 'cover.gif', { type: 'image/gif' }),
    ]);
    const response = await handler(request as never, deps);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Unsupported image type' });

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

describe('createGetListingImage', () => {
  function buildRequest(imageId: string) {
    const request = new Request(`http://example.test/api/listing-images/${imageId}`);
    return {
      request,
      deps: {
        auth: { userId: '', sessionId: '' },
        url: new URL(request.url),
      },
    };
  }

  function buildVariantRequest(imageId: string, variant: string) {
    const request = new Request(
      `http://example.test/api/listing-images/${imageId}?variant=${variant}`,
    );
    return {
      request,
      deps: {
        auth: { userId: '', sessionId: '' },
        url: new URL(request.url),
      },
    };
  }

  test('streams the image bytes with the stored mime type and immutable cache header', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    seedListingImage(database, {
      storedFilename: 'photo.jpg',
      mimeType: 'image/jpeg',
    });
    const uploadDir = await createUploadDir();
    await writeFile(join(uploadDir, 'photo.jpg'), 'jpeg-bytes');

    const handler = createGetListingImage({
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = buildRequest('image-1');
    const response = await handler(request as never, deps);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    const bodyText = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
    expect(bodyText).toBe('jpeg-bytes');

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('serves the webp thumbnail when variant=thumb and a thumb is recorded', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    seedListingImage(database, {
      storedFilename: 'photo.jpg',
      thumbStoredFilename: 'photo_thumb.webp',
      mimeType: 'image/jpeg',
    });
    const uploadDir = await createUploadDir();
    await writeFile(join(uploadDir, 'photo.jpg'), 'jpeg-bytes');
    await writeFile(join(uploadDir, 'photo_thumb.webp'), 'webp-bytes');

    const handler = createGetListingImage({
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = buildVariantRequest('image-1', 'thumb');
    const response = await handler(request as never, deps);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/webp');
    const bodyText = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
    expect(bodyText).toBe('webp-bytes');

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('falls back to the original image when variant=thumb but no thumb is recorded', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    seedListingImage(database, {
      storedFilename: 'photo.jpg',
      mimeType: 'image/jpeg',
    });
    const uploadDir = await createUploadDir();
    await writeFile(join(uploadDir, 'photo.jpg'), 'jpeg-bytes');

    const handler = createGetListingImage({
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = buildVariantRequest('image-1', 'thumb');
    const response = await handler(request as never, deps);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    const bodyText = new TextDecoder().decode(new Uint8Array(await response.arrayBuffer()));
    expect(bodyText).toBe('jpeg-bytes');

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('returns 404 when the image row is missing', async () => {
    const database = await createTestDatabase();
    const uploadDir = await createUploadDir();
    const handler = createGetListingImage({
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = buildRequest('does-not-exist');
    const response = await handler(request as never, deps);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Image not found' });

    await rm(uploadDir, { recursive: true, force: true });
  });

  test('returns 404 when the row exists but the file is missing', async () => {
    const database = await createTestDatabase();
    seedUser(database);
    seedListing(database);
    seedListingImage(database, { storedFilename: 'missing.png' });
    const uploadDir = await createUploadDir();

    const handler = createGetListingImage({
      listingImagesStore: createListingImagesStore(database),
      uploadDir,
    });

    const { request, deps } = buildRequest('image-1');
    const response = await handler(request as never, deps);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Image not found' });

    await rm(uploadDir, { recursive: true, force: true });
  });
});
