import { describe, expect, test } from 'bun:test';
import {
  RANKS_CSV_HEADER,
  loadGameRanksCsv,
  parseGameRanksCsv,
  parseRating,
  resolveCsvPath,
  validateRanksCsvHeader,
} from './gameRanks';

const validCsv = `${RANKS_CSV_HEADER}
1,Azul,2017,100,6.98765,7.12345,1000,0,,,,,,,,
2,"No Ratings",2024,0,,,0,0,,,,,,,,
3,"Expansion",2020,0,5.5,6.25,5,1,,,,,,,,
`;

describe('game ranks CSV helpers', () => {
  test('parses numeric ratings and empty ratings', () => {
    expect(parseRating('7.123')).toBe(7.123);
    expect(parseRating('')).toBeNull();
    expect(parseRating('not-a-number')).toBeNull();
  });

  test('parses BGG ranks CSV rows into game inputs', () => {
    expect(parseGameRanksCsv(validCsv)).toEqual([
      {
        id: 1,
        name: 'Azul',
        year: 2017,
        isExpansion: false,
        rating: 7.12345,
        adjustedRating: 6.98765,
      },
      {
        id: 2,
        name: 'No Ratings',
        year: 2024,
        isExpansion: false,
        rating: null,
        adjustedRating: null,
      },
      {
        id: 3,
        name: 'Expansion',
        year: 2020,
        isExpansion: true,
        rating: 6.25,
        adjustedRating: 5.5,
      },
    ]);
  });

  test('rejects malformed, non-positive, and unsafe game IDs', () => {
    for (const id of ['12oops', '0', '-1', '9007199254740992']) {
      const csv = `${RANKS_CSV_HEADER}\n${id},Azul,2017,100,6.98765,7.12345,1000,0,,,,,,,,\n`;
      expect(() => parseGameRanksCsv(csv)).toThrow(`Invalid game ID: ${id}`);
    }
  });

  test('rejects CSV files with an unexpected header', () => {
    expect(() => validateRanksCsvHeader('id,name\n1,Azul\n')).toThrow(
      'Ranks CSV header does not match',
    );
  });

  test('loads parsed games in batches without logging when logger is null', () => {
    const batches: unknown[] = [];

    const result = loadGameRanksCsv(validCsv, (batch) => batches.push(batch), {
      batchSize: 2,
      logger: null,
    });

    expect(result).toEqual({ inserted: 3, total: 3 });
    expect(batches).toHaveLength(2);
    expect(batches).toMatchObject([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  });

  test('rejects non-positive and non-integer batch sizes before parsing', () => {
    for (const batchSize of [0, -1, 1.5]) {
      expect(() => loadGameRanksCsv('invalid CSV', () => {}, { batchSize })).toThrow(
        'batchSize must be a positive integer.',
      );
    }
  });

  test('resolves CSV path from CLI args and defaults', () => {
    expect(
      resolveCsvPath({
        args: ['--csv', 'cli.csv'],
        defaultPath: 'default.csv',
      }),
    ).toBe('cli.csv');

    expect(
      resolveCsvPath({
        args: [],
        defaultPath: 'default.csv',
      }),
    ).toBe('default.csv');

    expect(
      resolveCsvPath({
        args: [],
        defaultPath: 'default.csv',
      }),
    ).toBe('default.csv');
  });
});
