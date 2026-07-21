import { BunRequest } from 'bun';
import { db } from '../db/client';
import { createShopsStore } from '../db/shopsTable';
import { RouteDependencies } from '../middleware/dependencies';
import { requireAdmin, type RequireAdminOptions } from '../middleware/requireAdmin';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type ShopBody = {
  name?: string;
  city?: string;
  state?: string;
  zip?: string;
  address?: string;
  website_url?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
};

type ParsedCreateShopBody = {
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ShopsStore = Pick<
  ReturnType<typeof createShopsStore>,
  'listAllShops' | 'createShop' | 'updateShop' | 'removeShop'
>;

type CreateGetShopsOptions = {
  shopsStore?: ShopsStore;
};

type CreatePostShopOptions = RequireAdminOptions & {
  createShopId?: () => string;
  shopsStore?: ShopsStore;
};

type CreatePatchShopOptions = RequireAdminOptions & {
  shopsStore?: ShopsStore;
};

type CreateDeleteShopOptions = RequireAdminOptions & {
  shopsStore?: ShopsStore;
};

const defaultShopsStore = createShopsStore(db);

function matchShopId(url: URL) {
  return url.pathname.match(/^\/api\/shops\/([^/]+)$/)?.[1];
}

function normalizeRequiredText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeOptionalText(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseCoordinate(
  value: string | number | null | undefined,
  fieldName: string,
  min: number,
  max: number,
): number | null | Response {
  if (value === undefined || value === null || value === '') return null;

  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') return null;

  const parsed = typeof normalized === 'number' ? normalized : Number(normalized);
  if (!Number.isFinite(parsed)) {
    return badRequest(`${fieldName} must be a number`);
  }
  if (parsed < min || parsed > max) {
    return badRequest(`${fieldName} must be between ${min} and ${max}`);
  }
  return parsed;
}

/** Validates and normalizes a request body for a shop. */
export function parseCreateShopBody(body: ShopBody | null): ParsedCreateShopBody | Response {
  if (!body) return badRequest('Invalid JSON body');

  const name = normalizeRequiredText(body.name);
  if (!name) return badRequest('name is required');

  const city = normalizeRequiredText(body.city);
  if (!city) return badRequest('city is required');

  const latitude = parseCoordinate(body.latitude, 'latitude', -90, 90);
  if (latitude instanceof Response) return latitude;

  const longitude = parseCoordinate(body.longitude, 'longitude', -180, 180);
  if (longitude instanceof Response) return longitude;

  if ((latitude === null) !== (longitude === null)) {
    return badRequest('latitude and longitude must be provided together');
  }

  return {
    name,
    city,
    state: normalizeOptionalText(body.state),
    zip: normalizeOptionalText(body.zip),
    address: normalizeOptionalText(body.address),
    website_url: normalizeOptionalText(body.website_url),
    latitude,
    longitude,
  };
}

/** Creates the handler that lists game shops. */
export function createGetShops({ shopsStore = defaultShopsStore }: CreateGetShopsOptions = {}) {
  return async function getShops(_: BunRequest<'/api/shops'>, __: RouteDependencies) {
    return json({ items: shopsStore.listAllShops() });
  };
}

/** Lists game shops using application dependencies. */
export const getShops = createGetShops();

/** Creates the admin handler that creates a game shop. */
export function createPostShop({
  createShopId = () => randomToken(18),
  findUser,
  shopsStore = defaultShopsStore,
}: CreatePostShopOptions = {}) {
  return async function postShop(request: BunRequest<'/api/shops'>, { auth }: RouteDependencies) {
    const denied = requireAdmin(auth, { findUser });
    if (denied) return denied;

    const parsed = parseCreateShopBody(await readJson<ShopBody>(request));
    if (parsed instanceof Response) return parsed;

    const shop = shopsStore.createShop({
      id: createShopId(),
      ...parsed,
    });

    return json({ item: shop }, { status: 201 });
  };
}

/** Creates a game shop using application dependencies. */
export const postShop = createPostShop();

/** Creates the admin handler that updates a game shop. */
export function createPatchShop({
  findUser,
  shopsStore = defaultShopsStore,
}: CreatePatchShopOptions = {}) {
  return async function patchShop(
    request: BunRequest<'/api/shops/:id'>,
    { auth, url }: RouteDependencies,
  ) {
    const denied = requireAdmin(auth, { findUser });
    if (denied) return denied;

    const shopId = matchShopId(url);
    if (!shopId) return badRequest('Invalid shop ID');

    const parsed = parseCreateShopBody(await readJson<ShopBody>(request));
    if (parsed instanceof Response) return parsed;

    const updated = shopsStore.updateShop(shopId, parsed);
    if (!updated) return notFound('Shop not found');

    return json({ item: updated });
  };
}

/** Updates a game shop using application dependencies. */
export const patchShop = createPatchShop();

/** Creates the admin handler that deletes a game shop. */
export function createDeleteShop({
  findUser,
  shopsStore = defaultShopsStore,
}: CreateDeleteShopOptions = {}) {
  return async function deleteShop(
    _: BunRequest<'/api/shops/:id'>,
    { auth, url }: RouteDependencies,
  ) {
    const denied = requireAdmin(auth, { findUser });
    if (denied) return denied;

    const shopId = matchShopId(url);
    if (!shopId) return badRequest('Invalid shop ID');

    const removed = shopsStore.removeShop(shopId);
    return removed ? new Response(null, { status: 204 }) : notFound('Shop not found');
  };
}

/** Deletes a game shop using application dependencies. */
export const deleteShop = createDeleteShop();
