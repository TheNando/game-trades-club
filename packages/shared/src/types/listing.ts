import type { Shop } from './shop';

/** A seller's marketplace offer for a board game. */
export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game: { id: number; name: string; };
  rating: number | null;
  cover_image: ListingImage | null;
  game_image_path: string | null;
  condition: string;
  price: number;
  status: ListingStatus;
  preferred_shop_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Supported physical conditions for a listed game copy. */
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

/** A listing with seller, images, and preferred pickup shop details. */
export type ListingDetail = Omit<Listing, 'cover_image'> & {
  images: ListingImage[];
  seller: {
    id: string;
    name: string | null;
    avatar_url: string | null;
    created_at: string;
  };
  preferred_shop: Shop | null;
};

/** Optional criteria for filtering marketplace listings. */
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

/** Metadata for an uploaded listing image. */
export type ListingImage = {
  id: string;
  has_thumb: boolean;
};

/** Lifecycle state of a marketplace listing. */
export type ListingStatus = 'open' | 'pending' | 'complete';
