import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { ListingCard, type ListingCardData } from '../components/ListingCard';
import {
  CONDITION_OPTIONS,
  emptyGamesFilters,
  gamesFiltersToSearch,
  isEmptyGamesFilters,
  parseGamesFiltersFromSearch,
  toggleNumberInList,
  toggleStringInList,
  type GamesFilterState,
} from './gamesFilters';

type Listing = ListingCardData & {
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ListingsResponse = {
  items: Listing[];
};

type TaxonomyOption = { id: number; name: string; };

type ListingFiltersResponse = {
  categories: TaxonomyOption[];
  mechanics: TaxonomyOption[];
};

function readFiltersFromUrl(): GamesFilterState {
  if (typeof window === 'undefined') return emptyGamesFilters();
  return parseGamesFiltersFromSearch(new URLSearchParams(window.location.search));
}

function writeFiltersToUrl(state: GamesFilterState) {
  if (typeof window === 'undefined') return;
  const params = gamesFiltersToSearch(state);
  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState(null, '', nextUrl);
}

export function Games() {
  const [filters, setFilters] = useState<GamesFilterState>(readFiltersFromUrl);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [categories, setCategories] = useState<TaxonomyOption[]>([]);
  const [mechanics, setMechanics] = useState<TaxonomyOption[]>([]);

  const queryString = useMemo(() => gamesFiltersToSearch(filters).toString(), [filters]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await fetch('/api/listing-filters', { credentials: 'include' });
        if (!response.ok) return;
        const data = (await response.json()) as ListingFiltersResponse;
        if (!isMounted) return;
        setCategories(data.categories ?? []);
        setMechanics(data.mechanics ?? []);
      } catch {
        // non-fatal: the filter lists stay empty
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    writeFiltersToUrl(filters);
    setLoading(true);
    setError('');

    const loadListings = async () => {
      try {
        const url = `/api/listings${queryString ? `?${queryString}` : ''}`;
        const response = await fetch(url, { credentials: 'include' });
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
  }, [queryString]);

  const updateFilters = (patch: Partial<GamesFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  };

  const clearFilters = () => setFilters(emptyGamesFilters());

  const hasFilters = !isEmptyGamesFilters(filters);

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

      <section class="max-w-6xl mx-auto px-4 md:px-8 py-10 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div>
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
              <h2 class="font-display text-2xl">
                {hasFilters ? 'No listings match your filters' : 'No listings yet'}
              </h2>
              <p class="mt-2 text-base-content/70">
                {hasFilters
                  ? 'Try loosening or clearing your filters to see more listings.'
                  : 'Be the first to share a game with your neighbors.'}
              </p>
              <div class="mt-6 flex justify-center gap-2">
                {hasFilters ? (
                  <button type="button" class="btn btn-outline rounded-xl" onClick={clearFilters}>
                    Clear filters
                  </button>
                ) : null}
                <a href="/add-listing" class="btn btn-primary rounded-xl">
                  List a game
                </a>
              </div>
            </div>
          ) : (
            <ul class="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {listings.map((listing) => (
                <li key={listing.id}>
                  <ListingCard listing={listing} showDescription />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside class="lg:sticky lg:top-20 lg:self-start">
          <FilterSidebar
            filters={filters}
            categories={categories}
            mechanics={mechanics}
            hasFilters={hasFilters}
            onChange={updateFilters}
            onClear={clearFilters}
          />
        </aside>
      </section>
    </div>
  );
}

type FilterSidebarProps = {
  filters: GamesFilterState;
  categories: TaxonomyOption[];
  mechanics: TaxonomyOption[];
  hasFilters: boolean;
  onChange: (patch: Partial<GamesFilterState>) => void;
  onClear: () => void;
};

function FilterSidebar({ filters, categories, mechanics, hasFilters, onChange, onClear }: FilterSidebarProps) {
  return (
    <div class="rounded-2xl border border-base-300 bg-base-100 shadow-sm p-4 flex flex-col gap-5">
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-display text-lg">Filters</h2>
        <button
          type="button"
          class="btn btn-ghost btn-xs"
          onClick={onClear}
          disabled={!hasFilters}
        >
          Clear all
        </button>
      </div>

      <FilterSection title="Condition">
        <div class="flex flex-col gap-1.5">
          {CONDITION_OPTIONS.map((option) => (
            <label key={option.value} class="label cursor-pointer justify-start gap-2 py-1">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={filters.conditions.includes(option.value)}
                onChange={() =>
                  onChange({ conditions: toggleStringInList(filters.conditions, option.value) })
                }
              />
              <span class="label-text text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <RangeInputs
          minValue={filters.priceMin}
          maxValue={filters.priceMax}
          minPlaceholder="$ min"
          maxPlaceholder="$ max"
          onMinChange={(value) => onChange({ priceMin: value })}
          onMaxChange={(value) => onChange({ priceMax: value })}
        />
      </FilterSection>

      <FilterSection title="Year published">
        <RangeInputs
          minValue={filters.yearMin}
          maxValue={filters.yearMax}
          minPlaceholder="From"
          maxPlaceholder="To"
          onMinChange={(value) => onChange({ yearMin: value })}
          onMaxChange={(value) => onChange({ yearMax: value })}
        />
      </FilterSection>

      <FilterSection title="Player count">
        <input
          type="number"
          min="1"
          inputMode="numeric"
          class="input input-bordered input-sm w-full"
          placeholder="Number of players"
          value={filters.players}
          onInput={(event) => onChange({ players: (event.currentTarget as HTMLInputElement).value })}
        />
      </FilterSection>

      <FilterSection title="Playtime (minutes)">
        <input
          type="number"
          min="1"
          inputMode="numeric"
          class="input input-bordered input-sm w-full"
          placeholder="e.g. 60"
          value={filters.playtime}
          onInput={(event) => onChange({ playtime: (event.currentTarget as HTMLInputElement).value })}
        />
      </FilterSection>

      <FilterSection title="Complexity / Weight">
        <RangeInputs
          minValue={filters.weightMin}
          maxValue={filters.weightMax}
          minPlaceholder="Min (1–5)"
          maxPlaceholder="Max (1–5)"
          onMinChange={(value) => onChange({ weightMin: value })}
          onMaxChange={(value) => onChange({ weightMax: value })}
        />
      </FilterSection>

      <FilterSection title="Minimum Rating">
        <input
          type="number"
          min="1"
          max="10"
          step="0.1"
          inputMode="decimal"
          class="input input-bordered input-sm w-full"
          placeholder="e.g. 7.0"
          value={filters.minRating}
          onInput={(event) => onChange({ minRating: (event.currentTarget as HTMLInputElement).value })}
        />
        <div class="flex rounded-lg border border-base-300 overflow-hidden text-xs mt-1">
          <button
            type="button"
            class={`flex-1 py-1 px-2 transition-colors ${filters.ratingType === 'average' ? 'bg-primary text-primary-content font-semibold' : 'bg-base-100 text-base-content/70 hover:bg-base-200'}`}
            onClick={() => onChange({ ratingType: 'average' })}
          >
            Avg Rating
          </button>
          <button
            type="button"
            class={`flex-1 py-1 px-2 transition-colors ${filters.ratingType === 'adjusted' ? 'bg-primary text-primary-content font-semibold' : 'bg-base-100 text-base-content/70 hover:bg-base-200'}`}
            onClick={() => onChange({ ratingType: 'adjusted' })}
          >
            Geek Rating
          </button>
        </div>
      </FilterSection>

      <TaxonomyFilterSection
        title="Categories"
        options={categories}
        selected={filters.categoryIds}
        onToggle={(id) => onChange({ categoryIds: toggleNumberInList(filters.categoryIds, id) })}
      />

      <TaxonomyFilterSection
        title="Mechanics"
        options={mechanics}
        selected={filters.mechanicIds}
        onToggle={(id) => onChange({ mechanicIds: toggleNumberInList(filters.mechanicIds, id) })}
      />
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: ComponentChildren; }) {
  return (
    <div class="flex flex-col gap-2">
      <p class="text-xs uppercase tracking-[0.16em] text-base-content/60 font-semibold">{title}</p>
      {children}
    </div>
  );
}

type RangeInputsProps = {
  minValue: string;
  maxValue: string;
  minPlaceholder: string;
  maxPlaceholder: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
};

function RangeInputs({ minValue, maxValue, minPlaceholder, maxPlaceholder, onMinChange, onMaxChange }: RangeInputsProps) {
  return (
    <div class="grid grid-cols-2 gap-2">
      <input
        type="number"
        inputMode="numeric"
        class="input input-bordered input-sm w-full"
        placeholder={minPlaceholder}
        value={minValue}
        onInput={(event) => onMinChange((event.currentTarget as HTMLInputElement).value)}
      />
      <input
        type="number"
        inputMode="numeric"
        class="input input-bordered input-sm w-full"
        placeholder={maxPlaceholder}
        value={maxValue}
        onInput={(event) => onMaxChange((event.currentTarget as HTMLInputElement).value)}
      />
    </div>
  );
}

type TaxonomyFilterSectionProps = {
  title: string;
  options: TaxonomyOption[];
  selected: number[];
  onToggle: (id: number) => void;
};

function TaxonomyFilterSection({ title, options, selected, onToggle }: TaxonomyFilterSectionProps) {
  return (
    <FilterSection title={title}>
      {options.length === 0 ? (
        <p class="text-xs text-base-content/55">No options available yet.</p>
      ) : (
        <div class="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1">
          {options.map((option) => (
            <label key={option.id} class="label cursor-pointer justify-start gap-2 py-0.5">
              <input
                type="checkbox"
                class="checkbox checkbox-xs"
                checked={selected.includes(option.id)}
                onChange={() => onToggle(option.id)}
              />
              <span class="label-text text-sm">{option.name}</span>
            </label>
          ))}
        </div>
      )}
    </FilterSection>
  );
}
