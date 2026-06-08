import { useEffect, useState } from 'preact/hooks';
import { ShopMap, type ShopMapPoint } from '../components/ShopMap';

type CurrentUser = {
	id: string;
};

type ListingImage = { id: string; has_thumb: boolean };

type Seller = {
	id: string;
	name: string | null;
	avatar_url: string | null;
	created_at: string;
};

type PreferredShop = {
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

function formatCityStateZip(city: string, state: string | null, zip: string | null): string {
	const stateZip = [state, zip].filter(Boolean).join(' ');
	return stateZip ? `${city}, ${stateZip}` : city;
}

type Listing = {
	id: string;
	user_id: string;
	description: string | null;
	game: { id: number; name: string };
	images: ListingImage[];
	seller: Seller;
	condition: string;
	price: number;
	status: 'open' | 'pending' | 'complete';
	preferred_shop: PreferredShop | null;
	created_at: string;
	updated_at: string;
};

function buildGoogleMapsUrl(shop: PreferredShop): string {
	if (shop.latitude !== null && shop.longitude !== null) {
		return `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
	}
	const query = [shop.name, shop.address, shop.city, shop.state, shop.zip].filter(Boolean).join(', ');
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type ListingResponse = { item: Listing };

const CONDITION_LABELS: Record<string, string> = {
	new: 'New',
	like_new: 'Like New',
	good: 'Good',
	fair: 'Fair',
	poor: 'Poor',
};

const STATUS_LABELS: Record<Listing['status'], string> = {
	open: 'Open',
	pending: 'Pending',
	complete: 'Complete',
};

function formatCondition(condition: string): string {
	return CONDITION_LABELS[condition] ?? condition;
}

function formatPrice(price: number): string {
	return `$${price}`;
}

function formatMemberSince(value: string): string {
	const date = new Date(value.replace(' ', 'T') + 'Z');
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function ListingDetail({ id }: { id?: string }) {
	const [listing, setListing] = useState<Listing | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [activeImageId, setActiveImageId] = useState<string | null>(null);
	const [me, setMe] = useState<CurrentUser | null>(null);

	useEffect(() => {
		if (!id) {
			setError('Listing not found.');
			setLoading(false);
			return;
		}

		let isMounted = true;
		const loadListing = async () => {
			try {
				const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
					credentials: 'include',
				});

				if (response.status === 404) {
					if (isMounted) setError('Listing not found.');
					return;
				}
				if (!response.ok) {
					if (isMounted) setError('Unable to load this listing right now.');
					return;
				}

				const data = (await response.json()) as ListingResponse;
				if (!isMounted) return;
				setListing(data.item);
				setActiveImageId(data.item.images[0]?.id ?? null);
			} catch {
				if (isMounted) setError('Unable to load this listing right now.');
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadListing();
		return () => {
			isMounted = false;
		};
	}, [id]);

	useEffect(() => {
		let isMounted = true;
		const loadCurrentUser = async () => {
			try {
				const response = await fetch('/api/me', { credentials: 'include' });
				if (!response.ok) {
					if (isMounted) setMe(null);
					return;
				}
				const data = (await response.json()) as CurrentUser;
				if (isMounted) setMe(data);
			} catch {
				if (isMounted) setMe(null);
			}
		};

		loadCurrentUser();
		return () => {
			isMounted = false;
		};
	}, []);

	if (loading) {
		return (
			<div class="max-w-5xl mx-auto px-4 md:px-8 py-10">
				<div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">
					<span>Loading listing...</span>
				</div>
			</div>
		);
	}

	if (error || !listing) {
		return (
			<div class="max-w-5xl mx-auto px-4 md:px-8 py-10">
				<div class="alert alert-error rounded-xl">
					<span>{error || 'Listing not found.'}</span>
				</div>
				<div class="mt-6">
					<a href="/games" class="btn btn-ghost rounded-xl border border-base-300">
						Back to listings
					</a>
				</div>
			</div>
		);
	}

	const activeImage =
		listing.images.find((image) => image.id === activeImageId) ?? listing.images[0] ?? null;
	const sellerLabel = listing.seller.name ?? 'A neighbor';
	const sellerInitial = (listing.seller.name ?? 'N').slice(0, 1).toUpperCase();
	const isOwner = me !== null && me.id === listing.user_id;

	return (
		<div class="min-h-screen bg-base-100 text-base-content">
			<section class="max-w-5xl mx-auto px-4 md:px-8 pt-8 md:pt-10 pb-4">
				<a
					href="/games"
					class="inline-flex items-center gap-1.5 text-sm text-base-content/65 hover:text-base-content"
				>
					<svg viewBox="0 0 24 24" class="w-4 h-4 fill-none stroke-current" stroke-width="2" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
					</svg>
					All listings
				</a>
			</section>

			<section class="max-w-5xl mx-auto px-4 md:px-8 pb-16 grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-10">
				<ListingGallery images={listing.images} activeImage={activeImage} onSelect={setActiveImageId} gameName={listing.game.name} />
				<ListingSummary
					listing={listing}
					sellerLabel={sellerLabel}
					sellerInitial={sellerInitial}
					isOwner={isOwner}
					onListingChange={setListing}
				/>
			</section>
		</div>
	);
}

type GalleryProps = {
	images: ListingImage[];
	activeImage: ListingImage | null;
	onSelect: (imageId: string) => void;
	gameName: string;
};

function ListingGallery({ images, activeImage, onSelect, gameName }: GalleryProps) {
	return (
		<div class="flex flex-col gap-3">
			{activeImage ? (
				<img
					src={`/api/listing-images/${activeImage.id}`}
					alt={gameName}
					class="w-full h-auto rounded-2xl border border-base-300 bg-base-200"
				/>
			) : (
				<div class="w-full aspect-[4/3] rounded-2xl border border-base-300 bg-base-200/60 flex items-center justify-center text-base-content/40">
					No image
				</div>
			)}

			{images.length > 1 ? (
				<ul class="grid grid-cols-4 gap-2">
					{images.map((image) => {
						const isActive = activeImage?.id === image.id;
						return (
							<li key={image.id}>
								<button
									type="button"
									onClick={() => onSelect(image.id)}
									class={`block w-full aspect-square rounded-xl overflow-hidden border transition-colors ${
										isActive
											? 'border-primary ring-2 ring-primary/40'
											: 'border-base-300 hover:border-base-content/30'
									}`}
									aria-label={`Show image ${image.id}`}
									aria-pressed={isActive}
								>
									<img
										src={`/api/listing-images/${image.id}${image.has_thumb ? '?variant=thumb' : ''}`}
										alt=""
										class="w-full h-full object-cover"
										loading="lazy"
									/>
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
		</div>
	);
}

type SummaryProps = {
	listing: Listing;
	sellerLabel: string;
	sellerInitial: string;
	isOwner: boolean;
	onListingChange: (listing: Listing) => void;
};

function ListingSummary({ listing, sellerLabel, sellerInitial, isOwner, onListingChange }: SummaryProps) {
	const [isEditing, setIsEditing] = useState(false);

	return (
		<div class="flex flex-col gap-6">
			<div>
				<p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">
					Listing
				</p>
				<h1 class="font-display text-3xl md:text-4xl font-medium mt-2 leading-tight">
					{listing.game.name}
				</h1>
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<span class="font-display text-2xl text-primary">{formatPrice(listing.price)}</span>
					<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-base-300 bg-base-200/60 text-xs text-base-content/75">
						{formatCondition(listing.condition)}
					</span>
					<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-base-300 bg-base-200/60 text-xs text-base-content/75">
						{STATUS_LABELS[listing.status]}
					</span>
					{isOwner && !isEditing ? (
						<button
							type="button"
							class="btn btn-sm btn-outline rounded-lg ml-auto"
							onClick={() => setIsEditing(true)}
						>
							Edit
						</button>
					) : null}
				</div>
			</div>

			{isEditing ? (
				<ListingEditForm
					listing={listing}
					onCancel={() => setIsEditing(false)}
					onSaved={(updated) => {
						onListingChange(updated);
						setIsEditing(false);
					}}
				/>
			) : (
				<div class="rounded-2xl border border-base-300 bg-base-100 p-5">
					<h2 class="font-display text-lg">Description</h2>
					{listing.description ? (
						<p class="mt-2 text-base-content/75 leading-relaxed whitespace-pre-wrap">
							{listing.description}
						</p>
					) : (
						<p class="mt-2 text-base-content/50 italic">No description provided.</p>
					)}
				</div>
			)}

			{listing.preferred_shop ? <PreferredShopCard shop={listing.preferred_shop} /> : null}

			<div class="rounded-2xl border border-base-300 bg-base-100 p-5">
				<h2 class="font-display text-lg">Seller</h2>
				<a
					href={`/users/${listing.seller.id}`}
					class="mt-3 flex items-center gap-3 -mx-2 px-2 py-1 rounded-xl hover:bg-base-200 transition-colors"
				>
					<div class="w-12 h-12 rounded-full overflow-hidden border border-base-300 bg-base-200 grid place-items-center">
						{listing.seller.avatar_url ? (
							<img alt={sellerLabel} src={listing.seller.avatar_url} class="w-full h-full object-cover" />
						) : (
							<span class="text-base font-semibold text-base-content/70">{sellerInitial}</span>
						)}
					</div>
					<div class="flex flex-col">
						<span class="font-medium">{sellerLabel}</span>
						<span class="text-xs text-base-content/60">
							Member since {formatMemberSince(listing.seller.created_at)}
						</span>
					</div>
				</a>
				<p class="mt-4 text-xs text-base-content/55">
					Messaging is coming soon. For now, save this listing and check back.
				</p>
			</div>
		</div>
	);
}


type PreferredShopCardProps = {
	shop: PreferredShop;
};

function PreferredShopCard({ shop }: PreferredShopCardProps) {
	const mapsHref = buildGoogleMapsUrl(shop);
	const hasCoords = shop.latitude !== null && shop.longitude !== null;
	const points: ShopMapPoint[] = hasCoords
		? [{
			id: shop.id,
			name: shop.name,
			city: shop.city,
			address: shop.address,
			website_url: shop.website_url,
			latitude: shop.latitude as number,
			longitude: shop.longitude as number,
		}]
		: [];

	return (
		<div class="rounded-2xl border border-base-300 bg-base-100 p-5">
			<h2 class="font-display text-lg">Suggested meetup</h2>
			<div class="mt-3">
				<p class="font-medium">{shop.name}</p>
				{shop.address ? (
					<p class="text-sm text-base-content/70">{shop.address}</p>
				) : null}
				<p class="text-sm text-base-content/70">{formatCityStateZip(shop.city, shop.state, shop.zip)}</p>
				{shop.website_url ? (
					<a
						class="text-sm text-primary hover:underline break-all"
						href={shop.website_url}
						target="_blank"
						rel="noreferrer"
					>
						{shop.website_url}
					</a>
				) : null}
			</div>
			{hasCoords ? (
				<div class="mt-4">
					<ShopMap points={points} className="h-48 w-full rounded-xl border border-base-300" zoom={14} />
				</div>
			) : null}
			<div class="mt-4 flex flex-wrap gap-2">
				<a
					class="btn btn-sm btn-outline rounded-lg"
					href={mapsHref}
					target="_blank"
					rel="noreferrer"
				>
					Open in Google Maps
				</a>
			</div>
			<p class="mt-3 text-xs text-base-content/55">
				The seller suggested this spot. You can propose a different one once messaging is available.
			</p>
		</div>
	);
}


type ListingEditFormProps = {
	listing: Listing;
	onCancel: () => void;
	onSaved: (listing: Listing) => void;
};

function ListingEditForm({ listing, onCancel, onSaved }: ListingEditFormProps) {
	const [description, setDescription] = useState(listing.description ?? '');
	const [condition, setCondition] = useState(listing.condition);
	const [price, setPrice] = useState(String(listing.price));
	const [saving, setSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState('');

	const submit = async (event: Event) => {
		event.preventDefault();
		setErrorMessage('');

		const normalizedPrice = price.trim();
		if (!/^[0-9]+$/.test(normalizedPrice)) {
			setErrorMessage('Enter price in dollars.');
			return;
		}

		setSaving(true);
		try {
			const response = await fetch(`/api/listings/${encodeURIComponent(listing.id)}`, {
				method: 'PATCH',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					description: description.trim(),
					condition,
					price: normalizedPrice,
				}),
			});

			if (response.status === 401) {
				setErrorMessage('You must be signed in to edit this listing.');
				return;
			}
			if (response.status === 404) {
				setErrorMessage('Listing not found or you no longer have permission to edit it.');
				return;
			}
			if (!response.ok) {
				setErrorMessage('Unable to save changes. Please try again.');
				return;
			}

			onSaved({
				...listing,
				description: description.trim() ? description.trim() : null,
				condition,
				price: Number(normalizedPrice),
			});
		} catch {
			setErrorMessage('Unable to save changes. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<form class="rounded-2xl border border-base-300 bg-base-100 p-5 flex flex-col gap-4" onSubmit={submit}>
			<h2 class="font-display text-lg">Edit listing</h2>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="flex flex-col gap-1.5">
					<label class="text-sm font-medium" for="edit-listing-condition">Condition</label>
					<select
						id="edit-listing-condition"
						aria-label="Condition"
						class="select select-bordered rounded-xl"
						value={condition}
						onInput={(event) =>
							setCondition((event.currentTarget as HTMLSelectElement).value)
						}
					>
						<option value="new">New</option>
						<option value="like_new">Like New</option>
						<option value="good">Good</option>
						<option value="fair">Fair</option>
						<option value="poor">Poor</option>
					</select>
				</div>

				<div class="flex flex-col gap-1.5">
					<label class="text-sm font-medium" for="edit-listing-price">Price ($)</label>
					<input
						id="edit-listing-price"
						aria-label="Price ($)"
						class="input input-bordered rounded-xl"
						type="number"
						inputMode="numeric"
						min="0"
						step="1"
						required
						value={price}
						onInput={(event) =>
							setPrice((event.currentTarget as HTMLInputElement).value)
						}
					/>
				</div>
			</div>

			<div class="flex flex-col gap-1.5">
				<label class="text-sm font-medium" for="edit-listing-description">Description</label>
				<textarea
					id="edit-listing-description"
					aria-label="Description"
					class="textarea textarea-bordered rounded-xl min-h-32"
					maxLength={1200}
					value={description}
					onInput={(event) =>
						setDescription((event.currentTarget as HTMLTextAreaElement).value)
					}
				/>
			</div>

			{errorMessage ? (
				<div class="alert alert-error rounded-xl text-sm">
					<span>{errorMessage}</span>
				</div>
			) : null}

			<div class="flex flex-wrap gap-2 justify-end">
				<button
					type="button"
					class="btn btn-ghost rounded-lg border border-base-300"
					onClick={onCancel}
					disabled={saving}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="btn btn-primary rounded-lg"
					disabled={saving}
				>
					{saving ? 'Saving...' : 'Save changes'}
				</button>
			</div>
		</form>
	);
}
