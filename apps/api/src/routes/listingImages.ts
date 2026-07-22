import { BunRequest } from 'bun';
import { MAX_LISTING_IMAGES } from '@game-trades-club/shared/constants';
import { listingImageUploadSchema } from '@game-trades-club/shared/validation';
import { z } from 'zod';
import { join } from 'node:path';
import { db } from '../db/client';
import { createListingImagesStore } from '../db/listingImagesTable';
import { createListingsStore } from '../db/listingsTable';
import { RouteDependencies } from '../middleware/dependencies';
import {
  getListingImageUploadDir,
  isSupportedListingImage,
  removeListingImageFile,
  saveListingImage,
} from '../storage/listingImageStorage';
import { badRequest, json, notFound, serverError } from '../utils/http';

type ListingsStore = Pick<ReturnType<typeof createListingsStore>, 'findListingByIdForUser'>;
type ListingImagesStore = Pick<ReturnType<typeof createListingImagesStore>, 'createListingImage'>;
type ListingImagesReadStore = Pick<
  ReturnType<typeof createListingImagesStore>,
  'findListingImageById'
>;

type CreatePostListingImageOptions = {
  listingsStore?: ListingsStore;
  listingImagesStore?: ListingImagesStore;
  uploadDir?: string;
};

type CreateGetListingImageOptions = {
  listingImagesStore?: ListingImagesReadStore;
  uploadDir?: string;
};

const defaultListingsStore = createListingsStore(db);
const defaultListingImagesStore = createListingImagesStore(db);

function matchListingImageId(url: URL) {
  return url.pathname.match(/^\/api\/listing-images\/([^/]+)$/)?.[1];
}

function validationError(error: z.ZodError): Response {
  return badRequest(error.issues[0]?.message ?? 'Invalid request');
}

/** Creates the handler that uploads an image for an owned listing. */
export function createPostListingImage({
  listingsStore = defaultListingsStore,
  listingImagesStore = defaultListingImagesStore,
  uploadDir = getListingImageUploadDir(),
}: CreatePostListingImageOptions = {}) {
  return async function postListingImage(
    request: BunRequest<'/api/listing-images'>,
    { auth }: RouteDependencies,
  ) {
    const formData = await request.formData();
    const files = formData
      .getAll('image')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) return badRequest('image is required');
    if (files.length > MAX_LISTING_IMAGES) {
      return badRequest(`You can upload up to ${MAX_LISTING_IMAGES} images.`);
    }
    if (files.length > 1) return badRequest('Only one image may be uploaded at a time');

    const metadata = listingImageUploadSchema.safeParse({ listing_id: formData.get('listing_id') });
    if (!metadata.success) return validationError(metadata.error);

    const file = files[0];
    if (!isSupportedListingImage(file)) return badRequest('Unsupported image type');

    const listing = listingsStore.findListingByIdForUser(metadata.data.listing_id, auth.userId);
    if (!listing) return notFound('Listing not found');

    const savedFile = await saveListingImage(uploadDir, file);

    try {
      const item = listingImagesStore.createListingImage({
        id: crypto.randomUUID(),
        listing_id: listing.id,
        owner_id: auth.userId,
        original_filename: savedFile.originalFilename,
        stored_filename: savedFile.storedFilename,
        thumb_stored_filename: savedFile.thumbStoredFilename,
        width: savedFile.width,
        height: savedFile.height,
        mime_type: savedFile.mimeType,
      });

      return json({ item }, { status: 201 });
    } catch {
      await removeListingImageFile(savedFile.absolutePath);
      if (savedFile.thumbAbsolutePath) {
        await removeListingImageFile(savedFile.thumbAbsolutePath);
      }
      return serverError('Unable to save image');
    }
  };
}

/** Uploads an image for an owned listing using application dependencies. */
export const postListingImage = createPostListingImage();

const IMMUTABLE_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Creates the handler that serves stored listing image variants. */
export function createGetListingImage({
  listingImagesStore = defaultListingImagesStore,
  uploadDir = getListingImageUploadDir(),
}: CreateGetListingImageOptions = {}) {
  return async function getListingImage(
    _: BunRequest<'/api/listing-images/:id'>,
    { url }: RouteDependencies,
  ) {
    const imageId = matchListingImageId(url);
    if (!imageId) return notFound('Image not found');

    const image = listingImagesStore.findListingImageById(imageId);
    if (!image) return notFound('Image not found');

    const variant = url.searchParams.get('variant');
    const wantsThumb = variant === 'thumb' && image.thumb_stored_filename !== null;
    const storedFilename = wantsThumb ? image.thumb_stored_filename! : image.stored_filename;
    const contentType = wantsThumb ? 'image/webp' : image.mime_type;

    const file = Bun.file(join(uploadDir, storedFilename));
    if (!(await file.exists())) return notFound('Image not found');

    return new Response(file.stream(), {
      headers: {
        'content-type': contentType,
        'cache-control': IMMUTABLE_IMAGE_CACHE_CONTROL,
      },
    });
  };
}

/** Serves stored listing image variants using application dependencies. */
export const getListingImage = createGetListingImage();
