import { useEffect, useMemo, useState } from 'preact/hooks';
import { ShopMap, type ShopMapPoint } from '../components/ShopMap';

type Shop = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  zip: string | null;
  address: string | null;
  website_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ShopsResponse = { items: Shop[]; };

function googleMapsUrl(shop: Shop): string {
  if (shop.latitude !== null && shop.longitude !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
  }
  const query = [shop.name, shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function formatStateZip(state: string | null, zip: string | null): string {
  return [state, zip].filter(Boolean).join(' ');
}

function groupByCity(shops: Shop[]): { city: string; shops: Shop[]; }[] {
  const grouped = new Map<string, Shop[]>();
  for (const shop of shops) {
    const bucket = grouped.get(shop.city) ?? [];
    bucket.push(shop);
    grouped.set(shop.city, bucket);
  }
  return Array.from(grouped.entries())
    .map(([city, items]) => ({ city, shops: items.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

export function Shops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/shops', { credentials: 'include' });
        if (!response.ok) {
          if (isMounted) setError('Unable to load shops.');
          return;
        }
        const data = (await response.json()) as ShopsResponse;
        if (isMounted) setShops(data.items ?? []);
      } catch {
        if (isMounted) setError('Unable to load shops.');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const mapPoints = useMemo<ShopMapPoint[]>(
    () => shops
      .filter((shop) => shop.latitude !== null && shop.longitude !== null)
      .map((shop) => ({
        id: shop.id,
        name: shop.name,
        city: shop.city,
        address: shop.address,
        website_url: shop.website_url,
        latitude: shop.latitude as number,
        longitude: shop.longitude as number,
      })),
    [shops]
  );

  const grouped = useMemo(() => groupByCity(shops), [shops]);
  const shopsWithoutCoords = shops.length - mapPoints.length;

  return (
    <div class="min-h-screen bg-base-100 text-base-content">
      <section class="relative overflow-hidden border-b border-base-300 bg-base-200 bg-paper">
        <div class="absolute inset-0 bg-dotgrid opacity-[0.25] pointer-events-none" />
        <div class="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-12 pb-8">
          <p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">Directory</p>
          <h1 class="font-display text-4xl md:text-5xl font-medium mt-2 leading-tight">Pickup shops</h1>
          <p class="mt-3 text-base-content/70 max-w-xl">
            Friendly game stores where neighbors meet to hand off trades.
          </p>
        </div>
      </section>

      <section class="max-w-5xl mx-auto px-4 md:px-8 py-10 flex flex-col gap-8">
        {loading ? (
          <div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">Loading shops...</div>
        ) : error ? (
          <div class="alert alert-error rounded-xl"><span>{error}</span></div>
        ) : shops.length === 0 ? (
          <div class="rounded-2xl border border-base-300 bg-base-200/60 p-6 text-base-content/65">
            No shops yet. Check back soon.
          </div>
        ) : (
          <>
            {mapPoints.length > 0 ? (
              <ShopMap points={mapPoints} className="h-80 w-full rounded-2xl border border-base-300" />
            ) : (
              <div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-sm text-base-content/65">
                None of the shops below have coordinates yet, so the map is hidden for now.
              </div>
            )}

            {shopsWithoutCoords > 0 && mapPoints.length > 0 ? (
              <p class="text-xs text-base-content/55">
                {shopsWithoutCoords} {shopsWithoutCoords === 1 ? 'shop is' : 'shops are'} missing coordinates and not shown on the map.
              </p>
            ) : null}

            <div class="flex flex-col gap-8">
              {grouped.map((group) => (
                <div key={group.city}>
                  <h2 class="font-display text-xl">{group.city}</h2>
                  <ul class="mt-3 grid gap-3 sm:grid-cols-2">
                    {group.shops.map((shop) => (
                      <li key={shop.id} class="rounded-2xl border border-base-300 bg-base-100 shadow-sm p-4">
                        <p class="font-medium leading-tight">{shop.name}</p>
                        {shop.address ? (
                          <p class="text-sm text-base-content/70">{shop.address}</p>
                        ) : null}
                        {shop.state || shop.zip ? (
                          <p class="text-sm text-base-content/70">{formatStateZip(shop.state, shop.zip)}</p>
                        ) : null}
                        {shop.website_url ? (
                          <a
                            class="mt-1 inline-block text-sm text-primary hover:underline break-all"
                            href={shop.website_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shop.website_url}
                          </a>
                        ) : null}
                        <div class="mt-3">
                          <a
                            class="btn btn-xs btn-outline rounded-lg"
                            href={googleMapsUrl(shop)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Google Maps
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
