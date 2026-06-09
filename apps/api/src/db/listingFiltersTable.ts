import type { Database } from 'bun:sqlite';
import { db } from './client';

export type TaxonomyOption = {
  id: number;
  name: string;
};

export function createListingFiltersStore(database: Database) {
  const categoriesStmt = database.query<TaxonomyOption, []>(
    `SELECT DISTINCT categories.id, categories.name
     FROM categories
     JOIN game_categories ON game_categories.category_id = categories.id
     JOIN listings ON listings.game_id = game_categories.game_id
     ORDER BY categories.name ASC`
  );

  const mechanicsStmt = database.query<TaxonomyOption, []>(
    `SELECT DISTINCT mechanics.id, mechanics.name
     FROM mechanics
     JOIN game_mechanics ON game_mechanics.mechanic_id = mechanics.id
     JOIN listings ON listings.game_id = game_mechanics.game_id
     ORDER BY mechanics.name ASC`
  );

  return {
    listCategoriesWithListings(): TaxonomyOption[] {
      return categoriesStmt.all();
    },
    listMechanicsWithListings(): TaxonomyOption[] {
      return mechanicsStmt.all();
    },
  };
}

const listingFiltersStore = createListingFiltersStore(db);

export const {
  listCategoriesWithListings,
  listMechanicsWithListings,
} = listingFiltersStore;
