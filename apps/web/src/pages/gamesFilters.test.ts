import { describe, expect, test } from 'bun:test';
import {
  emptyGamesFilters,
  gamesFiltersToSearch,
  isEmptyGamesFilters,
  parseGamesFiltersFromSearch,
  toggleNumberInList,
  toggleStringInList,
} from './gamesFilters';

describe('emptyGamesFilters / isEmptyGamesFilters', () => {
  test('empty state is detected as empty', () => {
    expect(isEmptyGamesFilters(emptyGamesFilters())).toBe(true);
  });

  test('any populated field flips the empty check', () => {
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

    expect(parseGamesFiltersFromSearch(params)).toEqual({
      conditions: ['new', 'like_new', 'good'],
      priceMin: '5',
      priceMax: '50',
      yearMin: '2010',
      yearMax: '2024',
      players: '4',
      playtime: '60',
      categoryIds: [1, 2],
      mechanicIds: [7],
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
});

describe('gamesFiltersToSearch', () => {
  test('serializes only populated fields', () => {
    const params = gamesFiltersToSearch({
      ...emptyGamesFilters(),
      conditions: ['new', 'good'],
      priceMin: '5',
      players: '4',
      categoryIds: [10, 20],
    });
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
});

describe('toggleStringInList / toggleNumberInList', () => {
  test('adds the value when absent', () => {
    expect(toggleStringInList(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleNumberInList([1], 2)).toEqual([1, 2]);
  });

  test('removes the value when present', () => {
    expect(toggleStringInList(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleNumberInList([1, 2], 1)).toEqual([2]);
  });
});
