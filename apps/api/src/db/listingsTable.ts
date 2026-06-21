import type { Database } from 'bun:sqlite';
import { db } from './client';
import type { Shop } from './shopsTable';

export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game: { id: number; name: string; };
  rating: number | null;
  cover_image: { id: string; has_thumb: boolean; } | null;
  game_image_path: string | null;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  preferred_shop_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingDetail = Omit<Listing, 'cover_image'> & {
  images: { id: string; has_thumb: boolean; }[];
  seller: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  preferred_shop: Shop | null;
};

function buildGameImagePath(gameId: number, gameImageUrl: string | null): string | null {
  return gameImageUrl ? `/api/game-images/${gameId}?variant=thumb` : null;
}

type ListingDetailRow = {
  id: string;
  user_id: string;
  description: string | null;
  game_id: number;
  game_name: string;
  game_image_url: string | null;
  game_rating: number | null;
  seller_name: string | null;
  seller_avatar_url: string | null;
  seller_created_at: string;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  preferred_shop_id: string | null;
  shop_id: string | null;
  shop_name: string | null;
  shop_city: string | null;
  shop_state: string | null;
  shop_zip: string | null;
  shop_address: string | null;
  shop_website_url: string | null;
  shop_latitude: number | null;
  shop_longitude: number | null;
  shop_created_at: string | null;
  shop_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type ListingImageRow = {
  id: string;
  has_thumb: number;
};

type ListingRow = {
  id: string;
  user_id: string;
  description: string | null;
  game_id: number;
  game_name: string;
  game_image_url: string | null;
  game_rating: number | null;
  cover_image_id: string | null;
  cover_image_has_thumb: number | null;
  condition: string;
  price: number;
  status: 'open' | 'pending' | 'complete';
  preferred_shop_id: string | null;
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
  preferred_shop_id?: string | null;
};

type UpdateListingInput = {
  description?: string | null;
  game_id?: number;
  condition?: string;
  price?: number;
  status?: 'open' | 'pending' | 'complete';
  preferred_shop_id?: string | null;
};

export type ListingFilters = {
  conditions?: string[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  players?: number;
  playtime?: number;
  categoryIds?: number[];
  mechanicIds?: number[];
  weightMin?: number;
  weightMax?: number;
  minRating?: number;
  ratingType?: 'average' | 'adjusted';
};

function rowToListing(row: ListingRow): Listing {
  const cover = row.cover_image_id
    ? {
      id: row.cover_image_id,
      has_thumb: row.cover_image_has_thumb === 1,
    }
    : null;

  return {
    id: row.id,
    user_id: row.user_id,
    description: row.description,
    game: { id: row.game_id, name: row.game_name },
    rating: row.game_rating,
    cover_image: cover,
    game_image_path: cover ? null : buildGameImagePath(row.game_id, row.game_image_url),
    condition: row.condition,
    price: row.price,
    status: row.status,
    preferred_shop_id: row.preferred_shop_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToPreferredShop(row: ListingDetailRow): Shop | null {
  if (!row.shop_id) return null;
  return {
    id: row.shop_id,
    name: row.shop_name!,
    city: row.shop_city!,
    state: row.shop_state,
    zip: row.shop_zip,
    address: row.shop_address,
    website_url: row.shop_website_url,
    latitude: row.shop_latitude,
    longitude: row.shop_longitude,
    created_at: row.shop_created_at!,
    updated_at: row.shop_updated_at!,
  };
}

const listingSelectColumns = `listings.id, listings.user_id, listings.description, listings.game_id,
            games.name AS game_name,
            games.image_url AS game_image_url,
            games.rating AS game_rating,
            cover.id AS cover_image_id,
            CASE WHEN cover.thumb_stored_filename IS NOT NULL THEN 1 ELSE 0 END AS cover_image_has_thumb,
            listings.condition, listings.price, listings.status, listings.preferred_shop_id,
            listings.created_at, listings.updated_at`;

const listingCoverJoin = `JOIN games ON games.id = listings.game_id
     LEFT JOIN listing_images AS cover ON cover.id = (
       SELECT id FROM listing_images
       WHERE listing_id = listings.id
       ORDER BY created_at ASC, id ASC
       LIMIT 1
     )`;

function buildFilteredListingsQuery(filters: ListingFilters): { sql: string; params: (string | number)[]; } {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (filters.conditions && filters.conditions.length > 0) {
    where.push(`listings.condition IN (${filters.conditions.map(() => '?').join(', ')})`);
    params.push(...filters.conditions);
  }
  if (filters.priceMin !== undefined) {
    where.push('listings.price >= ?');
    params.push(filters.priceMin);
  }
  if (filters.priceMax !== undefined) {
    where.push('listings.price <= ?');
    params.push(filters.priceMax);
  }
  if (filters.yearMin !== undefined) {
    where.push('games.year >= ?');
    params.push(filters.yearMin);
  }
  if (filters.yearMax !== undefined) {
    where.push('games.year <= ?');
    params.push(filters.yearMax);
  }
  if (filters.players !== undefined) {
    where.push('games.min_players <= ? AND games.max_players >= ?');
    params.push(filters.players, filters.players);
  }
  if (filters.playtime !== undefined) {
    where.push('games.min_playtime <= ? AND games.max_playtime >= ?');
    params.push(filters.playtime, filters.playtime);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    where.push(
      `EXISTS (SELECT 1 FROM game_categories
                WHERE game_categories.game_id = games.id
                  AND game_categories.category_id IN (${filters.categoryIds.map(() => '?').join(', ')}))`
    );
    params.push(...filters.categoryIds);
  }
  if (filters.mechanicIds && filters.mechanicIds.length > 0) {
    where.push(
      `EXISTS (SELECT 1 FROM game_mechanics
                WHERE game_mechanics.game_id = games.id
                  AND game_mechanics.mechanic_id IN (${filters.mechanicIds.map(() => '?').join(', ')}))`
    );
    params.push(...filters.mechanicIds);
  }
  if (filters.weightMin !== undefined) {
    where.push('games.weight >= ?');
    params.push(filters.weightMin);
  }
  if (filters.weightMax !== undefined) {
    where.push('games.weight <= ?');
    params.push(filters.weightMax);
  }
  if (filters.minRating !== undefined) {
    const ratingCol = filters.ratingType === 'adjusted' ? 'games.adjusted_rating' : 'games.rating';
    where.push(`${ratingCol} >= ?`);
    params.push(filters.minRating);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     ${whereClause}
     ORDER BY listings.created_at DESC`;

  return { sql, params };
}

export function createListingsStore(database: Database) {
  const listAllStmt = database.query<ListingRow, []>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     ORDER BY listings.created_at DESC`
  );

  const listStmt = database.query<ListingRow, [string]>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     WHERE listings.user_id = ?
     ORDER BY listings.created_at DESC`
  );

  const findStmt = database.query<ListingRow, [string, string]>(
    `SELECT ${listingSelectColumns}
     FROM listings
     ${listingCoverJoin}
     WHERE listings.id = ? AND listings.user_id = ?`
  );

  const createStmt = database.query(
    `INSERT INTO listings (
       id,
       user_id,
       description,
       game_id,
       condition,
       price,
       status,
       preferred_shop_id
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const updateWithoutShopStmt = database.query(
    `UPDATE listings
     SET description = COALESCE(?, description),
         game_id = COALESCE(?, game_id),
         condition = COALESCE(?, condition),
         price = COALESCE(?, price),
         status = COALESCE(?, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  );

  const updateWithShopStmt = database.query(
    `UPDATE listings
     SET description = COALESCE(?, description),
         game_id = COALESCE(?, game_id),
         condition = COALESCE(?, condition),
         price = COALESCE(?, price),
         status = COALESCE(?, status),
         preferred_shop_id = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  );

  const deleteStmt = database.query(`DELETE FROM listings WHERE id = ? AND user_id = ?`);

  const findDetailStmt = database.query<ListingDetailRow, [string]>(
    `SELECT listings.id, listings.user_id, listings.description, listings.game_id,
            games.name AS game_name,
            games.image_url AS game_image_url,
            games.rating AS game_rating,
            users.name AS seller_name,
            users.avatar_url AS seller_avatar_url,
            users.created_at AS seller_created_at,
            listings.condition, listings.price, listings.status,
            listings.preferred_shop_id,
            shops.id AS shop_id,
            shops.name AS shop_name,
            shops.city AS shop_city,
            shops.state AS shop_state,
            shops.zip AS shop_zip,
            shops.address AS shop_address,
            shops.website_url AS shop_website_url,
            shops.latitude AS shop_latitude,
            shops.longitude AS shop_longitude,
            shops.created_at AS shop_created_at,
            shops.updated_at AS shop_updated_at,
            listings.created_at, listings.updated_at
     FROM listings
     JOIN games ON games.id = listings.game_id
     JOIN users ON users.id = listings.user_id
     LEFT JOIN shops ON shops.id = listings.preferred_shop_id
     WHERE listings.id = ?`
  );

  const listImagesStmt = database.query<ListingImageRow, [string]>(
    `SELECT id,
            CASE WHEN thumb_stored_filename IS NOT NULL THEN 1 ELSE 0 END AS has_thumb
     FROM listing_images
     WHERE listing_id = ?
     ORDER BY created_at ASC, id ASC`
  );

  return {
    listAllListings(): Listing[] {
      return listAllStmt.all().map(rowToListing);
    },
    listFilteredListings(filters: ListingFilters): Listing[] {
      const { sql, params } = buildFilteredListingsQuery(filters);
      return database.query<ListingRow, (string | number)[]>(sql).all(...params).map(rowToListing);
    },
    listListingsByUser(userId: string): Listing[] {
      return listStmt.all(userId).map(rowToListing);
    },
    findListingByIdForUser(listingId: string, userId: string): Listing | null {
      const row = findStmt.get(listingId, userId);
      return row ? rowToListing(row) : null;
    },
    findListingDetailById(listingId: string): ListingDetail | null {
      const row = findDetailStmt.get(listingId);
      if (!row) return null;

      const images = listImagesStmt
        .all(listingId)
        .map((image) => ({ id: image.id, has_thumb: image.has_thumb === 1 }));

      return {
        id: row.id,
        user_id: row.user_id,
        description: row.description,
        game: { id: row.game_id, name: row.game_name },
        rating: row.game_rating,
        game_image_path: images.length > 0
          ? null
          : buildGameImagePath(row.game_id, row.game_image_url),
        condition: row.condition,
        price: row.price,
        status: row.status,
        preferred_shop_id: row.preferred_shop_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        images,
        seller: {
          id: row.user_id,
          name: row.seller_name,
          avatar_url: row.seller_avatar_url,
          created_at: row.seller_created_at,
        },
        preferred_shop: rowToPreferredShop(row),
      };
    },
    createListing(userId: string, input: CreateListingInput): Listing {
      createStmt.run(
        input.id,
        userId,
        input.description,
        input.game_id,
        input.condition,
        input.price,
        input.status,
        input.preferred_shop_id ?? null
      );

      return rowToListing(findStmt.get(input.id, userId)!);
    },
    updateListing(userId: string, listingId: string, input: UpdateListingInput) {
      const includeShop = input.preferred_shop_id !== undefined;
      const result = includeShop
        ? updateWithShopStmt.run(
          input.description ?? null,
          input.game_id ?? null,
          input.condition ?? null,
          input.price ?? null,
          input.status ?? null,
          input.preferred_shop_id ?? null,
          listingId,
          userId
        )
        : updateWithoutShopStmt.run(
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
  findListingDetailById,
  listFilteredListings,
  listListingsByUser,
  removeListing,
  updateListing,
} = listingsStore;
