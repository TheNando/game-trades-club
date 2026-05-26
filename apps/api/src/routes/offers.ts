import { BunRequest } from 'bun';
// import { createOffer, removeOffer, listOffersByUser, updateOffer } from '../db/offersTable';
import { type RouteDependencies } from '../middleware/dependencies';
import { badRequest, json, notFound, readJson } from '../utils/http';
import { randomToken } from '../utils/security';

type OfferBody = {
  tradeId?: string;
  message?: string;
  priceCents?: number;
};


// export async function getOffers(
//   _: BunRequest<"/api/offers">,
//   { auth }: RouteDependencies
// ) {
//   return json({ items: listOffersByUser(auth.userId) });
// }

// export async function postOffer(
//   request: BunRequest<"/api/offers">,
//   { auth }: RouteDependencies
// ) {
//   const body = await readJson<OfferBody>(request);
//   if (!body) return badRequest('Invalid JSON body');

//   const offer = createOffer(auth.userId, {
//     id: randomToken(18),
//     tradeId: body.tradeId,
//     message: body.message,
//     priceCents: body.priceCents,
//   });

//   if (!offer) return notFound();
//   return json({ item: offer }, { status: 201 });
// }

// export async function patchOffer(
//   request: BunRequest<"/api/offers">,
//   { auth, url }: RouteDependencies
// ) {
//   const idMatch = url.pathname.match(/^\/api\/offers\/([^/]+)$/);
//   const offerId = idMatch?.[1];

//   if (!offerId) return badRequest('Invalid offer ID');

//   const body = await readJson<OfferBody>(request);
//   if (!body) return badRequest('Invalid JSON body');

//   const updated = updateOffer(auth.userId, offerId, {
//     tradeId: body.tradeId,
//     message: body.message,
//     priceCents: body.priceCents,
//   });

//   return updated ? new Response(null, { status: 204 }) : notFound();
// }

// export async function deleteOffer(
//   _: BunRequest<"/api/offers">,
//   { auth, url }: RouteDependencies
// ) {
//   const idMatch = url.pathname.match(/^\/api\/offers\/([^/]+)$/);
//   const offerId = idMatch?.[1];

//   if (!offerId) return badRequest('Invalid offer ID');

//   const deleted = removeOffer(auth.userId, offerId);
//   return deleted ? new Response(null, { status: 204 }) : notFound();
// }