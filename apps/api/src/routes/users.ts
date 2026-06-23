import { BunRequest } from 'bun';
import { db } from '../db/client';
import { type Listing, createListingsStore } from '../db/listingsTable';
import { type PublicUserProfile, findUserPublicProfileById } from '../db/usersTable';
import { RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound } from '../utils/http';

type UserProfileListingsStore = Pick<
  ReturnType<typeof createListingsStore>,
  'listListingsByUser'
>;

type CreateGetUserProfileOptions = {
  findUserPublicProfile?: (id: string) => PublicUserProfile | null;
  listingsStore?: UserProfileListingsStore;
};

const defaultListingsStore = createListingsStore(db);

function matchUserId(url: URL) {
  return url.pathname.match(/^\/api\/users\/([^/]+)$/)?.[1];
}

function partitionListings(listings: Listing[]) {
  const current: Listing[] = [];
  const past: Listing[] = [];
  for (const listing of listings) {
    if (listing.status === 'complete') {
      past.push(listing);
    } else {
      current.push(listing);
    }
  }
  return { current, past };
}

export function createGetUserProfile({
  findUserPublicProfile = findUserPublicProfileById,
  listingsStore = defaultListingsStore,
}: CreateGetUserProfileOptions = {}) {
  return async function getUserProfile(
    _: BunRequest<'/api/users/:id'>,
    { auth, url }: RouteDependencies
  ) {
    const userId = matchUserId(url);
    if (!userId) return badRequest('Invalid user ID');

    const user = findUserPublicProfile(userId);
    if (!user) return notFound('User not found');

    const { current, past } = partitionListings(listingsStore.listListingsByUser(userId, auth.userId));

    return json({
      user,
      current_listings: current,
      past_listings: past,
    });
  };
}

export const getUserProfile = createGetUserProfile();
