import type { Shop } from './shop';

export type Listing = {
  id: string;
  user_id: string;
  description: string | null;
  game: { id: number; name: string };
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

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

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

export type ListingImage = {
  id: string;
  has_thumb: boolean;
};

export type ListingStatus = 'open' | 'pending' | 'complete';
