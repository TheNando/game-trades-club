import { BunRequest } from 'bun';
import { createListingFiltersStore } from '../db/listingFiltersTable';
import { db } from '../db/client';
import { RouteDependencies } from '../middleware/dependencies';
import { json } from '../utils/http';

type ListingFiltersStore = Pick<
  ReturnType<typeof createListingFiltersStore>,
  'listCategoriesWithListings' | 'listMechanicsWithListings'
>;

type CreateGetListingFiltersOptions = {
  listingFiltersStore?: ListingFiltersStore;
};

const defaultListingFiltersStore = createListingFiltersStore(db);

/** Creates the handler that returns available listing filters. */
export function createGetListingFilters({
  listingFiltersStore = defaultListingFiltersStore,
}: CreateGetListingFiltersOptions = {}) {
  return async function getListingFilters(
    _: BunRequest<'/api/listing-filters'>,
    __: RouteDependencies,
  ) {
    return json({
      categories: listingFiltersStore.listCategoriesWithListings(),
      mechanics: listingFiltersStore.listMechanicsWithListings(),
    });
  };
}

/** Returns available listing filters using application dependencies. */
export const getListingFilters = createGetListingFilters();
