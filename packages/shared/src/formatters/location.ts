import type { Shop, ShopOption } from '../types/shop';

/** Builds a Google Maps search URL for a shop's coordinates or address. */
export function buildGoogleMapsUrl(
  shop: Pick<Shop, 'name' | 'address' | 'city' | 'state' | 'zip' | 'latitude' | 'longitude'>,
): string {
  if (shop.latitude !== null && shop.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
  }
  const query = [shop.name, shop.address, shop.city, shop.state, shop.zip]
    .filter(Boolean)
    .join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Formats a city with its optional state and ZIP code. */
export function formatCityStateZip(city: string, state: string | null, zip: string | null): string {
  const stateZip = [state, zip].filter(Boolean).join(' ');
  return stateZip ? `${city}, ${stateZip}` : city;
}

/** Formats a shop for use in a selection control. */
export function formatShopOptionLabel(shop: ShopOption): string {
  const location = [shop.city, shop.state].filter(Boolean).join(', ');
  return `${shop.name} — ${location}`;
}
