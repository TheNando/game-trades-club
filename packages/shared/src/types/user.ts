/** Publicly visible profile data for a user. */
export type PublicUserProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

/** Public profile data for a listing's seller. */
export type Seller = PublicUserProfile;

/** Authenticated user's account data. */
export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};
