import { useEffect, useState } from 'preact/hooks';

type ListingImage = { id: string; has_thumb: boolean };

type Seller = {
	id: string;
	name: string | null;
	avatar_url: string | null;
	created_at: string;
};

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
	created_at: string;
	updated_at: string;
};

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
				<ListingSummary listing={listing} sellerLabel={sellerLabel} sellerInitial={sellerInitial} />
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
};

function ListingSummary({ listing, sellerLabel, sellerInitial }: SummaryProps) {
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
				</div>
			</div>

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
