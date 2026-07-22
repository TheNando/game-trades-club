import { BunRequest } from 'bun';
import { shopSchema, type ShopRequest } from '@game-trades-club/shared/validation';
import { z } from 'zod';
import { db } from '../db/client';
import { createShopsStore } from '../db/shopsTable';
import { RouteDependencies } from '../middleware/dependencies';
import { requireAdmin, type RequireAdminOptions } from '../middleware/requireAdmin';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

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

function validationError(error: z.ZodError): Response {
  return badRequest(error.issues[0]?.message ?? 'Invalid request');
}

/** Validates and normalizes a request body for a shop. */
export function parseCreateShopBody(body: unknown): ShopRequest | Response {
  const parsed = shopSchema.safeParse(body);
  return parsed.success ? parsed.data : validationError(parsed.error);
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

    const parsed = parseCreateShopBody(await readJson<unknown>(request));
    if (parsed instanceof Response) return parsed;

    const shop = shopsStore.createShop({
      id: createShopId(),
      name: parsed.name,
      city: parsed.city,
      state: parsed.state ?? null,
      zip: parsed.zip ?? null,
      address: parsed.address ?? null,
      website_url: parsed.website_url ?? null,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
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

    const parsed = parseCreateShopBody(await readJson<unknown>(request));
    if (parsed instanceof Response) return parsed;

    const updated = shopsStore.updateShop(shopId, {
      name: parsed.name,
      city: parsed.city,
      state: parsed.state ?? null,
      zip: parsed.zip ?? null,
      address: parsed.address ?? null,
      website_url: parsed.website_url ?? null,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    });
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
