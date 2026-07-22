import type { Database } from 'bun:sqlite';
import { MAX_LISTING_IMAGES } from '@game-trades-club/shared/constants';

/** Represents metadata for a stored listing image. */
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

/** Creates database operations for listing images. */
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
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM listing_images WHERE listing_id = ?) < ?`,
  );

  const findStmt = database.query<ListingImage, [string]>(
    `SELECT id, listing_id, owner_id, original_filename, stored_filename,
            thumb_stored_filename, width, height, mime_type, created_at
     FROM listing_images
     WHERE id = ?`,
  );
  const countByListingStmt = database.query<{ count: number }, [string]>(
    'SELECT COUNT(*) AS count FROM listing_images WHERE listing_id = ?',
  );

  return {
    createListingImage(input: CreateListingImageInput): ListingImage | null {
      const result = createStmt.run(
        input.id,
        input.listing_id,
        input.owner_id,
        input.original_filename,
        input.stored_filename,
        input.thumb_stored_filename,
        input.width,
        input.height,
        input.mime_type,
        input.listing_id,
        MAX_LISTING_IMAGES,
      );

      return result.changes === 1 ? findStmt.get(input.id)! : null;
    },
    findListingImageById(id: string): ListingImage | null {
      return findStmt.get(id) ?? null;
    },
    countListingImages(listingId: string): number {
      return countByListingStmt.get(listingId)?.count ?? 0;
    },
  };
}
