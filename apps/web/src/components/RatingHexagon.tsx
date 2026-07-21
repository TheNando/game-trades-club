// BoardGameGeek rating colour scale, keyed by the rounded rating bucket (1-10).
const RATING_COLORS: Record<number, string> = {
  10: '#186B40',
  9: '#186B40',
  8: '#1D804C',
  7: '#1978B3',
  6: '#5369A2',
  5: '#5369A2',
  4: '#D71925',
  3: '#D71925',
  2: '#B2151F',
  1: '#B2151F',
  0: '666E75',
};

const HEXAGON_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

type RatingHexagonProps = {
  rating: number | null | undefined;
  class?: string;
};

/** Renders a BoardGameGeek rating badge when a valid rating is available. */
export function RatingHexagon({ rating, class: className = '' }: RatingHexagonProps) {
  if (rating === null || rating === undefined || !Number.isFinite(rating)) {
    return null;
  }

  const bucket = Math.min(10, Math.max(1, Math.round(rating)));
  const color = RATING_COLORS[bucket];
  const label = rating.toFixed(1);

  return (
    <div class={`drop-shadow-md ${className}`} title={`BGG Rating ${label}`}>
      <div
        class="flex items-center justify-center w-12 h-12 font-sans font-bold text-lg text-neutral-50 tabular-nums select-none"
        style={{ backgroundColor: color, clipPath: HEXAGON_CLIP }}
      >
        {label}
      </div>
    </div>
  );
}
