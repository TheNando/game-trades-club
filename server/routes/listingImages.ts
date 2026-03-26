import { BunRequest } from 'bun';
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

type CreatePostListingImageOptions = {
  listingsStore?: ListingsStore;
  listingImagesStore?: ListingImagesStore;
  uploadDir?: string;
};

const defaultListingsStore = createListingsStore(db);
const defaultListingImagesStore = createListingImagesStore(db);

export function createPostListingImage({
  listingsStore = defaultListingsStore,
  listingImagesStore = defaultListingImagesStore,
  uploadDir = getListingImageUploadDir(),
}: CreatePostListingImageOptions = {}) {
  return async function postListingImage(
    request: BunRequest<'/api/listing-images'>,
    { auth }: RouteDependencies
  ) {
    const formData = await request.formData();
    const files = formData
      .getAll('image')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) return badRequest('image is required');
    if (files.length > 1) return badRequest('Only one image may be uploaded at a time');

    const listingId = formData.get('listing_id');
    if (typeof listingId !== 'string' || listingId.trim() === '') {
      return badRequest('listing_id is required');
    }

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
