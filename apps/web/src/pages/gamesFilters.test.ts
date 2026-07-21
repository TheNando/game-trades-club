import { describe, expect, test } from 'bun:test';
import {
  emptyGamesFilters,
  gamesFiltersToSearch,
  isEmptyGamesFilters,
  parseGamesFiltersFromSearch,
} from './gamesFilters';

describe('emptyGamesFilters / isEmptyGamesFilters', () => {
  test('empty state is detected as empty', () => {
    expect(isEmptyGamesFilters(emptyGamesFilters())).toBe(true);
  });

  test('any populated field flips the empty check', () => {
    expect(isEmptyGamesFilters({ ...emptyGamesFilters(), query: 'catan' })).toBe(false);
    expect(isEmptyGamesFilters({ ...emptyGamesFilters(), priceMin: '5' })).toBe(false);
    expect(isEmptyGamesFilters({ ...emptyGamesFilters(), conditions: ['new'] })).toBe(false);
    expect(isEmptyGamesFilters({ ...emptyGamesFilters(), categoryIds: [1] })).toBe(false);
  });
});

describe('parseGamesFiltersFromSearch', () => {
  test('returns empty state when no params are present', () => {
    expect(parseGamesFiltersFromSearch(new URLSearchParams())).toEqual(emptyGamesFilters());
  });

  test('parses repeated and comma-separated multi-value params', () => {
    const params = new URLSearchParams();
    params.append('condition', 'new');
    params.append('condition', 'like_new,good');
    params.append('category', '1,2');
    params.append('mechanic', '7');
    params.set('price_min', '5');
    params.set('price_max', '50');
    params.set('year_min', '2010');
    params.set('year_max', '2024');
    params.set('players', '4');
    params.set('playtime', '60');
    params.set('q', '  catan  ');

    expect(parseGamesFiltersFromSearch(params)).toEqual({
      query: 'catan',
      conditions: ['new', 'like_new', 'good'],
      priceMin: '5',
      priceMax: '50',
      yearMin: '2010',
      yearMax: '2024',
      players: '4',
      playtime: '60',
      categoryIds: [1, 2],
      mechanicIds: [7],
      weightMin: '',
      weightMax: '',
      minRating: '',
      ratingType: 'average',
    });
  });

  test('drops unknown condition values silently', () => {
    const params = new URLSearchParams();
    params.set('condition', 'mint');
    expect(parseGamesFiltersFromSearch(params).conditions).toEqual([]);
  });

  test('drops non-integer category and mechanic ids', () => {
    const params = new URLSearchParams();
    params.set('category', '1,foo,3');
    params.set('mechanic', 'bar');
    const state = parseGamesFiltersFromSearch(params);
    expect(state.categoryIds).toEqual([1, 3]);
    expect(state.mechanicIds).toEqual([]);
  });

  test('drops non-numeric range values silently', () => {
    const params = new URLSearchParams();
    params.set('price_min', 'cheap');
    expect(parseGamesFiltersFromSearch(params).priceMin).toEqual('');
  });

  test('parses weight_min and weight_max as decimal strings', () => {
    const params = new URLSearchParams();
    params.set('weight_min', '1.5');
    params.set('weight_max', '3.5');
    const state = parseGamesFiltersFromSearch(params);
    expect(state.weightMin).toBe('1.5');
    expect(state.weightMax).toBe('3.5');
  });

  test('parses min_rating and rating_type', () => {
    const params = new URLSearchParams();
    params.set('min_rating', '7.5');
    params.set('rating_type', 'adjusted');
    const state = parseGamesFiltersFromSearch(params);
    expect(state.minRating).toBe('7.5');
    expect(state.ratingType).toBe('adjusted');
  });

  test('defaults ratingType to "average" for unknown or missing rating_type', () => {
    const params = new URLSearchParams();
    params.set('rating_type', 'unknown');
    expect(parseGamesFiltersFromSearch(params).ratingType).toBe('average');
    expect(parseGamesFiltersFromSearch(new URLSearchParams()).ratingType).toBe('average');
  });
});

describe('gamesFiltersToSearch', () => {
  test('serializes only populated fields', () => {
    const params = gamesFiltersToSearch({
      ...emptyGamesFilters(),
      query: 'catan',
      conditions: ['new', 'good'],
      priceMin: '5',
      players: '4',
      categoryIds: [10, 20],
    });
    expect(params.get('q')).toEqual('catan');
    expect(params.getAll('condition')).toEqual(['new', 'good']);
    expect(params.get('price_min')).toEqual('5');
    expect(params.has('price_max')).toBe(false);
    expect(params.get('players')).toEqual('4');
    expect(params.getAll('category')).toEqual(['10', '20']);
    expect(params.has('mechanic')).toBe(false);
  });

  test('round trips through parse and serialize', () => {
    const original = {
      ...emptyGamesFilters(),
      query: 'azul',
      conditions: ['new', 'good'],
      priceMin: '5',
      priceMax: '50',
      players: '4',
      categoryIds: [10, 20],
      mechanicIds: [7],
    };
    const params = gamesFiltersToSearch(original);
    expect(parseGamesFiltersFromSearch(params)).toEqual(original);
  });

  test('includes rating_type in params only when minRating is set', () => {
    const withRating = gamesFiltersToSearch({
      ...emptyGamesFilters(),
      minRating: '7',
      ratingType: 'adjusted',
    });
    expect(withRating.get('min_rating')).toBe('7');
    expect(withRating.get('rating_type')).toBe('adjusted');

    const withoutRating = gamesFiltersToSearch({ ...emptyGamesFilters(), ratingType: 'adjusted' });
    expect(withoutRating.has('min_rating')).toBe(false);
    expect(withoutRating.has('rating_type')).toBe(false);
  });

  test('round trips weight and rating through parse and serialize', () => {
    const original = {
      ...emptyGamesFilters(),
      weightMin: '1.5',
      weightMax: '3',
      minRating: '7.5',
      ratingType: 'adjusted' as const,
    };
    const params = gamesFiltersToSearch(original);
    expect(parseGamesFiltersFromSearch(params)).toEqual(original);
  });
});
