import { useEffect, useRef } from 'preact/hooks';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

// Vite serves leaflet's marker images via the bundler; Leaflet's default loader
// looks for them next to leaflet.css, so we override the icon URLs explicitly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/** Describes a shop marker displayed on the map. */
export type ShopMapPoint = {
  id: string;
  name: string;
  city: string;
  address?: string | null;
  website_url?: string | null;
  latitude: number;
  longitude: number;
};

type ShopMapProps = {
  points: ShopMapPoint[];
  className?: string;
  zoom?: number;
};

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const FALLBACK_CENTER: [number, number] = [0, 0];

/** Renders an interactive map with markers for shop locations. */
export function ShopMap({ points, className, zoom }: ShopMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: FALLBACK_CENTER,
      zoom: zoom ?? 2,
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    const validPoints = points.filter(
      (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
    );

    for (const point of validPoints) {
      const marker = L.marker([point.latitude, point.longitude]).addTo(map);
      marker.bindPopup(renderPopup(point));
      markersRef.current.push(marker);
    }

    if (validPoints.length === 1) {
      map.setView([validPoints[0].latitude, validPoints[0].longitude], zoom ?? 14);
    } else if (validPoints.length > 1) {
      const bounds = L.latLngBounds(validPoints.map((point) => [point.latitude, point.longitude]));
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: zoom ?? 14 });
    } else {
      map.setView(FALLBACK_CENTER, zoom ?? 2);
    }
  }, [points, zoom]);

  return (
    <div ref={containerRef} class={className ?? 'h-64 w-full rounded-2xl border border-base-300'} />
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPopup(point: ShopMapPoint): string {
  const name = escapeHtml(point.name);
  const city = escapeHtml(point.city);
  const address = point.address ? escapeHtml(point.address) : '';
  const query = encodeURIComponent(
    [point.address, point.city].filter(Boolean).join(', ') || point.name,
  );
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return `
		<div class="text-sm leading-tight">
			<p class="font-medium">${name}</p>
			<p class="text-base-content/70">${city}${address ? ` · ${address}` : ''}</p>
			<a class="text-primary hover:underline" href="${mapsHref}" target="_blank" rel="noreferrer">Open in Google Maps</a>
		</div>
	`;
}
