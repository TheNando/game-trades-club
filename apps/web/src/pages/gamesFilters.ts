import { CONDITION_OPTIONS } from '@game-trades-club/shared/constants';

/** Represents the catalog filter values persisted in the URL. */
export type GamesFilterState = {
  query: string;
  conditions: string[];
  priceMin: string;
  priceMax: string;
  yearMin: string;
  yearMax: string;
  players: string;
  playtime: string;
  categoryIds: number[];
  mechanicIds: number[];
  weightMin: string;
  weightMax: string;
  minRating: string;
  ratingType: 'average' | 'adjusted';
};

/** Creates the default catalog filter state. */
export function emptyGamesFilters(): GamesFilterState {
  return {
    query: '',
    conditions: [],
    priceMin: '',
    priceMax: '',
    yearMin: '',
    yearMax: '',
    players: '',
    playtime: '',
    categoryIds: [],
    mechanicIds: [],
    weightMin: '',
    weightMax: '',
    minRating: '',
    ratingType: 'average',
  };
}

/** Reports whether a filter state has no active filters. */
export function isEmptyGamesFilters(state: GamesFilterState): boolean {
  return (
    state.query.trim() === '' &&
    state.conditions.length === 0 &&
    state.priceMin === '' &&
    state.priceMax === '' &&
    state.yearMin === '' &&
    state.yearMax === '' &&
    state.players === '' &&
    state.playtime === '' &&
    state.categoryIds.length === 0 &&
    state.mechanicIds.length === 0 &&
    state.weightMin === '' &&
    state.weightMax === '' &&
    state.minRating === ''
  );
}

function parseIntList(values: string[]): number[] {
  const flattened = values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);
  const parsed: number[] = [];
  for (const value of flattened) {
    const num = Number(value);
    if (Number.isInteger(num)) parsed.push(num);
  }
  return parsed;
}

function parseNumberInput(value: string | null): string {
  if (value === null) return '';
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const num = Number(trimmed);
  return Number.isFinite(num) ? String(num) : '';
}

/** Parses catalog filters from URL search parameters. */
export function parseGamesFiltersFromSearch(search: URLSearchParams): GamesFilterState {
  const state = emptyGamesFilters();

  state.query = search.get('q')?.trim() ?? '';

  const conditions = search
    .getAll('condition')
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => CONDITION_OPTIONS.some((option) => option.value === value));
  state.conditions = Array.from(new Set(conditions));

  state.priceMin = parseNumberInput(search.get('price_min'));
  state.priceMax = parseNumberInput(search.get('price_max'));
  state.yearMin = parseNumberInput(search.get('year_min'));
  state.yearMax = parseNumberInput(search.get('year_max'));
  state.players = parseNumberInput(search.get('players'));
  state.playtime = parseNumberInput(search.get('playtime'));

  state.categoryIds = Array.from(new Set(parseIntList(search.getAll('category'))));
  state.mechanicIds = Array.from(new Set(parseIntList(search.getAll('mechanic'))));

  state.weightMin = parseNumberInput(search.get('weight_min'));
  state.weightMax = parseNumberInput(search.get('weight_max'));
  state.minRating = parseNumberInput(search.get('min_rating'));
  state.ratingType = search.get('rating_type') === 'adjusted' ? 'adjusted' : 'average';

  return state;
}

/** Serializes catalog filters into URL search parameters. */
export function gamesFiltersToSearch(state: GamesFilterState): URLSearchParams {
  const params = new URLSearchParams();
  const query = state.query.trim();
  if (query !== '') params.set('q', query);
  for (const condition of state.conditions) params.append('condition', condition);
  if (state.priceMin !== '') params.set('price_min', state.priceMin);
  if (state.priceMax !== '') params.set('price_max', state.priceMax);
  if (state.yearMin !== '') params.set('year_min', state.yearMin);
  if (state.yearMax !== '') params.set('year_max', state.yearMax);
  if (state.players !== '') params.set('players', state.players);
  if (state.playtime !== '') params.set('playtime', state.playtime);
  for (const id of state.categoryIds) params.append('category', String(id));
  for (const id of state.mechanicIds) params.append('mechanic', String(id));
  if (state.weightMin !== '') params.set('weight_min', state.weightMin);
  if (state.weightMax !== '') params.set('weight_max', state.weightMax);
  if (state.minRating !== '') {
    params.set('min_rating', state.minRating);
    params.set('rating_type', state.ratingType);
  }
  return params;
}
