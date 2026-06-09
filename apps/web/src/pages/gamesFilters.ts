export type GamesFilterState = {
  conditions: string[];
  priceMin: string;
  priceMax: string;
  yearMin: string;
  yearMax: string;
  players: string;
  playtime: string;
  categoryIds: number[];
  mechanicIds: number[];
};

export const CONDITION_OPTIONS: { value: string; label: string; }[] = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

export function emptyGamesFilters(): GamesFilterState {
  return {
    conditions: [],
    priceMin: '',
    priceMax: '',
    yearMin: '',
    yearMax: '',
    players: '',
    playtime: '',
    categoryIds: [],
    mechanicIds: [],
  };
}

export function isEmptyGamesFilters(state: GamesFilterState): boolean {
  return (
    state.conditions.length === 0 &&
    state.priceMin === '' &&
    state.priceMax === '' &&
    state.yearMin === '' &&
    state.yearMax === '' &&
    state.players === '' &&
    state.playtime === '' &&
    state.categoryIds.length === 0 &&
    state.mechanicIds.length === 0
  );
}

function parseIntList(values: string[]): number[] {
  const flattened = values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
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

export function parseGamesFiltersFromSearch(search: URLSearchParams): GamesFilterState {
  const state = emptyGamesFilters();

  const conditions = search.getAll('condition')
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

  return state;
}

export function gamesFiltersToSearch(state: GamesFilterState): URLSearchParams {
  const params = new URLSearchParams();
  for (const condition of state.conditions) params.append('condition', condition);
  if (state.priceMin !== '') params.set('price_min', state.priceMin);
  if (state.priceMax !== '') params.set('price_max', state.priceMax);
  if (state.yearMin !== '') params.set('year_min', state.yearMin);
  if (state.yearMax !== '') params.set('year_max', state.yearMax);
  if (state.players !== '') params.set('players', state.players);
  if (state.playtime !== '') params.set('playtime', state.playtime);
  for (const id of state.categoryIds) params.append('category', String(id));
  for (const id of state.mechanicIds) params.append('mechanic', String(id));
  return params;
}

export function toggleStringInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function toggleNumberInList(list: number[], value: number): number[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
