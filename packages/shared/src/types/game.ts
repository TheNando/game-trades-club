/** BoardGameGeek-enriched board game reference data. */
export type Game = {
  id: number;
  name: string;
  image_url: string | null;
  year: number | null;
  is_expansion: boolean;
  min_players: number | null;
  max_players: number | null;
  min_playtime: number | null;
  max_playtime: number | null;
  rating: number | null;
  adjusted_rating: number | null;
  weight: number | null;
};

/** Minimal game data returned by catalog searches. */
export type GameSearchResult = {
  id: number;
  name: string;
  year: number | null;
};

/** Named taxonomy entity available for filtering games. */
export type TaxonomyOption = {
  id: number;
  name: string;
};
