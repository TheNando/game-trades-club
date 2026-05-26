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
