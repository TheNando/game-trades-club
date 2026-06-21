export type PublicUserProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Seller = PublicUserProfile;

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
};
