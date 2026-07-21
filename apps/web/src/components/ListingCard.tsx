import { formatCondition, formatPrice } from '@game-trades-club/shared/formatters';
import type { ListingStatus } from '@game-trades-club/shared/types';
import { RatingHexagon } from './RatingHexagon';

/** Describes listing data rendered by a listing card. */
export type ListingCardData = {
  id: string;
  description: string | null;
  game: { id: number; name: string };
  rating?: number | null;
  cover_image: { id: string; has_thumb: boolean } | null;
  game_image_path: string | null;
  condition: string;
  price: number;
  status: ListingStatus;
  has_unread?: boolean;
};

type ListingCardProps = {
  listing: ListingCardData;
  showDescription?: boolean;
};

/** Renders a linked summary card for a marketplace listing. */
export function ListingCard({ listing, showDescription = false }: ListingCardProps) {
  return (
    <a
      href={`/listings/${listing.id}`}
      class="h-full rounded-2xl border border-base-300 bg-base-100 shadow-sm p-5 flex flex-col gap-3 hover:border-base-content/30 hover:shadow-md transition-all"
    >
      <div class="relative">
        {listing.has_unread && (
          <div class="absolute top-2 left-2 z-10" title="Unread messages">
            <span class="flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span class="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
          </div>
        )}
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
        <RatingHexagon rating={listing.rating} class="absolute top-2 right-2" />
      </div>
      <div class="flex items-baseline justify-between gap-3">
        <p class="font-display text-xl leading-tight truncate">{listing.game.name}</p>
        <span class="font-display text-lg text-primary">{formatPrice(listing.price)}</span>
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
          <p class="text-sm text-base-content/50 italic">No description provided.</p>
        )
      ) : null}
    </a>
  );
}
