export type ListingCardData = {
	id: string;
	description: string | null;
	game: { id: number; name: string };
	cover_image: { id: string; has_thumb: boolean } | null;
	game_image_path: string | null;
	condition: string;
	price: number;
	status: 'open' | 'pending' | 'complete';
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

type ListingCardProps = {
	listing: ListingCardData;
	showDescription?: boolean;
};

export function ListingCard({ listing, showDescription = false }: ListingCardProps) {
	return (
		<a
			href={`/listings/${listing.id}`}
			class="h-full rounded-2xl border border-base-300 bg-base-100 shadow-sm p-5 flex flex-col gap-3 hover:border-base-content/30 hover:shadow-md transition-all"
		>
			{listing.cover_image ? (
				<img
					src={`/api/listing-images/${listing.cover_image.id}${listing.cover_image.has_thumb ? '?variant=thumb' : ''}`}
					alt={listing.game.name}
					class="w-full object-cover rounded-xl border border-base-300 bg-base-200"
					loading="lazy"
				/>
			) : listing.game_image_path ? (
				<img
					src={listing.game_image_path}
					alt={listing.game.name}
					class="w-full object-contain rounded-xl border border-base-300 bg-base-200"
					loading="lazy"
				/>
			) : (
				<div class="w-full rounded-xl border border-base-300 bg-base-200/60 flex items-center justify-center text-base-content/40 text-sm">
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
			{showDescription ? (
				listing.description ? (
					<p class="text-sm text-base-content/70 leading-relaxed line-clamp-4">
						{listing.description}
					</p>
				) : (
					<p class="text-sm text-base-content/50 italic">
						No description provided.
					</p>
				)
			) : null}
		</a>
	);
}
