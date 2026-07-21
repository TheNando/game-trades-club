/** Physical game store available as a pickup location. */
export type Shop = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};

/** Minimal shop data for selection controls. */
export type ShopOption = {
  id: string;
  name: string;
  city: string;
  state: string | null;
};
