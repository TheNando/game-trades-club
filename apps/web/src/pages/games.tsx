import { useEffect, useState } from 'preact/hooks';

type Listing = {
	id: string;
	user_id: string;
	description: string | null;
	game: { id: number; name: string };
	cover_image: { id: string; has_thumb: boolean } | null;
	condition: string;
	price: number;
	status: 'open' | 'pending' | 'complete';
	created_at: string;
	updated_at: string;
};

type ListingsResponse = {
	items: Listing[];
};

const CONDITION_LABELS: Record<string, string> = {
	new: 'New',
	like_new: 'Like New',
	good: 'Good',
	fair: 'Fair',
	poor: 'Poor',
};

function formatCondition(condition: string): string {
	return CONDITION_LABELS[condition] ?? condition;
}

function formatPrice(price: number): string {
	return `$${price}`;
}

export function Games() {
	const [listings, setListings] = useState<Listing[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		let isMounted = true;

		const loadListings = async () => {
			try {
				const response = await fetch('/api/listings', { credentials: 'include' });
				if (!response.ok) {
					if (isMounted) setError('Unable to load listings right now.');
					return;
				}

				const data = (await response.json()) as ListingsResponse;
				if (isMounted) setListings(data.items ?? []);
			} catch {
				if (isMounted) setError('Unable to load listings right now.');
			} finally {
				if (isMounted) setLoading(false);
			}
		};

		loadListings();

		return () => {
			isMounted = false;
		};
	}, []);

	return (
		<div class="min-h-screen bg-base-100 text-base-content">
			<section class="relative overflow-hidden border-b border-base-300 bg-base-200 bg-paper">
				<div class="absolute inset-0 bg-dotgrid opacity-[0.25] pointer-events-none" />
				<div class="relative z-10 max-w-6xl mx-auto px-4 md:px-8 pt-14 pb-10">
					<p class="text-xs uppercase tracking-[0.22em] text-primary/80 font-semibold">
						Browse
					</p>
					<h1 class="font-display text-4xl md:text-5xl font-medium mt-2 leading-tight">
						All Listings
					</h1>
					<p class="mt-3 text-base-content/70 max-w-xl">
						See what neighbors are trading. Pick a game, message the owner, and
						set up a meetup at a local shop.
					</p>
				</div>
			</section>

			<section class="max-w-6xl mx-auto px-4 md:px-8 py-10">
				{loading ? (
					<div class="rounded-2xl border border-base-300 bg-base-200/60 p-4 text-base-content/75">
						<span>Loading listings...</span>
					</div>
				) : error ? (
					<div class="alert alert-error rounded-xl">
						<span>{error}</span>
					</div>
				) : listings.length === 0 ? (
					<div class="rounded-2xl border border-base-300 bg-base-200/60 p-8 shadow-sm text-center">
						<h2 class="font-display text-2xl">No listings yet</h2>
						<p class="mt-2 text-base-content/70">
							Be the first to share a game with your neighbors.
						</p>
						<div class="mt-6 flex justify-center">
							<a href="/add-listing" class="btn btn-primary rounded-xl">
								List a game
							</a>
						</div>
					</div>
				) : (
					<ul class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
						{listings.map((listing) => (
							<li
								key={listing.id}
								class="rounded-2xl border border-base-300 bg-base-100 shadow-sm p-5 flex flex-col gap-3"
							>
								{listing.cover_image ? (
									<img
										src={`/api/listing-images/${listing.cover_image.id}${listing.cover_image.has_thumb ? '?variant=thumb' : ''}`}
										alt={listing.game.name}
										class="w-full aspect-[4/3] object-cover rounded-xl border border-base-300 bg-base-200"
										loading="lazy"
									/>
								) : (
									<div class="w-full aspect-[4/3] rounded-xl border border-base-300 bg-base-200/60 flex items-center justify-center text-base-content/40 text-sm">
										No image
									</div>
								)}
								<div class="flex items-baseline justify-between gap-3">
									<p class="font-display text-xl leading-tight truncate">
										{listing.game.name}
									</p>
									<span class="font-display text-lg text-primary">
										{formatPrice(listing.price)}
									</span>
								</div>
								<div class="flex flex-wrap gap-2 text-xs">
									<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-base-300 bg-base-200/60 text-base-content/75">
										{formatCondition(listing.condition)}
									</span>
									<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-base-300 bg-base-200/60 text-base-content/75 capitalize">
										{listing.status}
									</span>
								</div>
								{listing.description ? (
									<p class="text-sm text-base-content/70 leading-relaxed line-clamp-4">
										{listing.description}
									</p>
								) : (
									<p class="text-sm text-base-content/50 italic">
										No description provided.
									</p>
								)}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
