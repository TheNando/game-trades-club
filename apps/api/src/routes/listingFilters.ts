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

export function createGetListingFilters({
  listingFiltersStore = defaultListingFiltersStore,
}: CreateGetListingFiltersOptions = {}) {
  return async function getListingFilters(
    _: BunRequest<'/api/listing-filters'>,
    __: RouteDependencies
  ) {
    return json({
      categories: listingFiltersStore.listCategoriesWithListings(),
      mechanics: listingFiltersStore.listMechanicsWithListings(),
    });
  };
}

export const getListingFilters = createGetListingFilters();
