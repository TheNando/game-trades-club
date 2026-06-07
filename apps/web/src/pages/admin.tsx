import { useEffect, useState } from 'preact/hooks';
import { NotFound } from './_404';

type CurrentUser = {
	id: string;
	email: string;
	name: string | null;
	avatarUrl: string | null;
	isAdmin: boolean;
};

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
	created_at: string;
	updated_at: string;
};

type ShopsResponse = {
	items: Shop[];
};

type ShopResponse = {
	item: Shop;
};

function normalizeWebsiteUrl(input: string): string {
	const trimmed = input.trim();
	if (!trimmed) return '';
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `https://${trimmed}`;
}

function parseCoordinate(value: string): { ok: true; value: number | null; } | { ok: false; } {
	const trimmed = value.trim();
	if (!trimmed) return { ok: true, value: null };
	const parsed = Number(trimmed);
	if (!Number.isFinite(parsed)) return { ok: false };
	return { ok: true, value: parsed };
}

function formatCityStateZip(city: string, state: string | null, zip: string | null): string {
	const stateZip = [state, zip].filter(Boolean).join(' ');
	return stateZip ? `${city}, ${stateZip}` : city;
}

export function Admin() {
	const [authChecked, setAuthChecked] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			try {
				const response = await fetch('/api/me', { credentials: 'include' });
				if (!response.ok) {
					if (isMounted) setIsAdmin(false);
					return;
				}
				const data = (await response.json()) as CurrentUser;
				if (isMounted) setIsAdmin(!!data.isAdmin);
			} catch {
				if (isMounted) setIsAdmin(false);
			} finally {
				if (isMounted) setAuthChecked(true);
			}
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	if (!authChecked || !isAdmin) return <NotFound />;

	return <AdminConsole />;
}

function AdminConsole() {
	const [shops, setShops] = useState<Shop[]>([]);
	const [loadingShops, setLoadingShops] = useState(true);
	const [loadError, setLoadError] = useState('');

	const [name, setName] = useState('');
	const [address, setAddress] = useState('');
	const [city, setCity] = useState('');
	const [state, setState] = useState('');
	const [zip, setZip] = useState('');
	const [websiteUrl, setWebsiteUrl] = useState('');
	const [latitude, setLatitude] = useState('');
	const [longitude, setLongitude] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState('');
	const [submitSuccess, setSubmitSuccess] = useState('');

	const loadShops = async () => {
		setLoadError('');
		try {
			const response = await fetch('/api/shops', { credentials: 'include' });
			if (!response.ok) {
				setLoadError('Unable to load shops.');
				return;
			}
			const data = (await response.json()) as ShopsResponse;
			setShops(data.items ?? []);
		} catch {
			setLoadError('Unable to load shops.');
		} finally {
			setLoadingShops(false);
		}
	};

	useEffect(() => {
		loadShops();
	}, []);

	const submitShop = async (event: Event) => {
		event.preventDefault();
		setSubmitError('');
		setSubmitSuccess('');

		if (!name.trim() || !city.trim()) {
			setSubmitError('Name and city are required.');
			return;
		}

		const lat = parseCoordinate(latitude);
		if (!lat.ok) {
			setSubmitError('Latitude must be a number.');
			return;
		}
		const lng = parseCoordinate(longitude);
		if (!lng.ok) {
			setSubmitError('Longitude must be a number.');
			return;
		}
		if ((lat.value === null) !== (lng.value === null)) {
			setSubmitError('Provide both latitude and longitude, or leave both empty.');
			return;
		}

		setSubmitting(true);
		try {
			const response = await fetch('/api/shops', {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					address: address.trim(),
					city: city.trim(),
					state: state.trim(),
					zip: zip.trim(),
					website_url: normalizeWebsiteUrl(websiteUrl),
					latitude: lat.value,
					longitude: lng.value,
				}),
			});

			if (!response.ok) {
				try {
					const errorBody = (await response.json()) as { error?: string };
					setSubmitError(errorBody.error ?? 'Unable to create shop.');
				} catch {
					setSubmitError('Unable to create shop.');
				}
				return;
			}

			const body = (await response.json()) as ShopResponse;
			setShops((existing) => [...existing, body.item].sort((a, b) => {
				const byCity = a.city.localeCompare(b.city);
				return byCity !== 0 ? byCity : a.name.localeCompare(b.name);
			}));
			setName('');
			setAddress('');
			setCity('');
			setState('');
			setZip('');
			setWebsiteUrl('');
			setLatitude('');
			setLongitude('');
			setSubmitSuccess('Shop added.');
		} catch {
			setSubmitError('Unable to create shop.');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div class="min-h-screen bg-base-100 text-base-content">
			<section class="relative overflow-hidden border-b border-base-300 bg-base-200 bg-paper">
				<div class="absolute inset-0 bg-dotgrid opacity-[0.25] pointer-events-none" />
				<div class="relative z-10 max-w-4xl mx-auto px-4 md:px-8 pt-12 pb-8">
					<p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">Admin</p>
					<h1 class="font-display text-4xl md:text-5xl font-medium mt-2 leading-tight">Game stores</h1>
					<p class="mt-3 text-base-content/70 max-w-xl">
						Add pickup-friendly shops where neighbors can meet to hand off games.
					</p>
				</div>
			</section>

			<section class="max-w-4xl mx-auto px-4 md:px-8 py-10 grid gap-10 md:grid-cols-[1fr_1fr]">
				<form class="rounded-2xl border border-base-300 bg-base-100 shadow-sm p-6 md:p-7 flex flex-col gap-4" onSubmit={submitShop}>
					<h2 class="font-display text-2xl">Add a shop</h2>
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium" for="shop-name">Name</label>
						<input id="shop-name" class="input input-bordered rounded-xl" type="text" required value={name}
							onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium" for="shop-address">Address</label>
						<input id="shop-address" class="input input-bordered rounded-xl" type="text" value={address}
							onInput={(e) => setAddress((e.currentTarget as HTMLInputElement).value)} />
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium" for="shop-city">City</label>
						<input id="shop-city" class="input input-bordered rounded-xl" type="text" required value={city}
							onInput={(e) => setCity((e.currentTarget as HTMLInputElement).value)} />
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label class="text-sm font-medium" for="shop-state">State</label>
							<input id="shop-state" class="input input-bordered rounded-xl" type="text" placeholder="CA" value={state}
								onInput={(e) => setState((e.currentTarget as HTMLInputElement).value)} />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-sm font-medium" for="shop-zip">ZIP</label>
							<input id="shop-zip" class="input input-bordered rounded-xl" type="text" inputMode="numeric" placeholder="94110" value={zip}
								onInput={(e) => setZip((e.currentTarget as HTMLInputElement).value)} />
						</div>
					</div>
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium" for="shop-website">Website</label>
						<input id="shop-website" class="input input-bordered rounded-xl" type="text" placeholder="example.com" value={websiteUrl}
							onInput={(e) => setWebsiteUrl((e.currentTarget as HTMLInputElement).value)} />
						<p class="text-xs text-base-content/55">https:// is added automatically if you leave it off.</p>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						<div class="flex flex-col gap-1.5">
							<label class="text-sm font-medium" for="shop-latitude">Latitude</label>
							<input id="shop-latitude" class="input input-bordered rounded-xl" type="text" inputMode="decimal" placeholder="40.7128" value={latitude}
								onInput={(e) => setLatitude((e.currentTarget as HTMLInputElement).value)} />
						</div>
						<div class="flex flex-col gap-1.5">
							<label class="text-sm font-medium" for="shop-longitude">Longitude</label>
							<input id="shop-longitude" class="input input-bordered rounded-xl" type="text" inputMode="decimal" placeholder="-74.0060" value={longitude}
								onInput={(e) => setLongitude((e.currentTarget as HTMLInputElement).value)} />
						</div>
						<p class="sm:col-span-2 text-xs text-base-content/55">
							On Google Maps, right-click the shop's location and click the coordinates at the top of the menu to copy them. Paste the first number into Latitude and the second into Longitude. Optional, but required to show the shop on the map.
						</p>
					</div>

					{submitError ? <div class="alert alert-error rounded-xl"><span>{submitError}</span></div> : null}
					{submitSuccess ? <div class="alert alert-success rounded-xl"><span>{submitSuccess}</span></div> : null}

					<div class="flex justify-end pt-2 border-t border-base-300">
						<button type="submit" class="btn btn-primary rounded-xl" disabled={submitting}>
							{submitting ? 'Adding...' : 'Add shop'}
						</button>
					</div>
				</form>

				<div class="flex flex-col gap-4">
					<div class="flex items-baseline justify-between gap-3">
						<h2 class="font-display text-2xl">Existing shops</h2>
						<span class="text-xs text-base-content/55">{shops.length}</span>
					</div>
					{loadingShops ? (
						<div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">Loading shops...</div>
					) : loadError ? (
						<div class="alert alert-error rounded-xl"><span>{loadError}</span></div>
					) : shops.length === 0 ? (
						<div class="rounded-2xl border border-base-300 bg-base-200/60 p-6 text-base-content/65">No shops yet.</div>
					) : (
						<ul class="flex flex-col gap-3">
							{shops.map((shop) => (
								<li key={shop.id} class="rounded-2xl border border-base-300 bg-base-100 shadow-sm p-4">
									<p class="font-display text-lg leading-tight">{shop.name}</p>
									{shop.address ? (
										<p class="text-sm text-base-content/70">{shop.address}</p>
									) : null}
									<p class="text-sm text-base-content/70">{formatCityStateZip(shop.city, shop.state, shop.zip)}</p>
									{shop.website_url ? (
										<a class="text-sm text-primary hover:underline break-all" href={shop.website_url} target="_blank" rel="noreferrer">
											{shop.website_url}
										</a>
									) : null}
									{shop.latitude !== null && shop.longitude !== null ? (
										<p class="mt-1 text-xs text-base-content/55 font-mono">{shop.latitude.toFixed(5)}, {shop.longitude.toFixed(5)}</p>
									) : (
										<p class="mt-1 text-xs text-warning/80">No coordinates · not on map</p>
									)}
								</li>
							))}
						</ul>
					)}
				</div>
			</section>
		</div>
	);
}
