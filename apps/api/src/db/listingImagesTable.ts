import type { Database } from 'bun:sqlite';
import { db } from './client';

export type ListingImage = {
  id: string;
  listing_id: string;
  owner_id: string;
  original_filename: string;
  stored_filename: string;
  thumb_stored_filename: string | null;
  width: number | null;
  height: number | null;
  mime_type: string;
  created_at: string;
};

type CreateListingImageInput = Omit<ListingImage, 'created_at'>;

export function createListingImagesStore(database: Database) {
  const createStmt = database.query(
    `INSERT INTO listing_images (
       id,
       listing_id,
       owner_id,
       original_filename,
       stored_filename,
       thumb_stored_filename,
       width,
       height,
       mime_type
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const findStmt = database.query<ListingImage, [string]>(
    `SELECT id, listing_id, owner_id, original_filename, stored_filename,
            thumb_stored_filename, width, height, mime_type, created_at
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
        input.thumb_stored_filename,
        input.width,
        input.height,
        input.mime_type
      );

      return findStmt.get(input.id)!;
    },
    findListingImageById(id: string): ListingImage | null {
      return findStmt.get(id) ?? null;
    },
  };
}

const listingImagesStore = createListingImagesStore(db);

export const { createListingImage, findListingImageById } = listingImagesStore;
