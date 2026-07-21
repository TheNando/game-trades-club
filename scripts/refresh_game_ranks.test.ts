import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'bun:test';
import { RANKS_CSV_HEADER } from './gameRanks';
import { downloadRanksCsv, refreshGameRanks } from './refresh_game_ranks';

const validCsv = `${RANKS_CSV_HEADER}
1,Azul,2017,100,6.98765,7.12345,1000,0,,,,,,,,
`;

describe('refresh game ranks', () => {
  test('downloads and validates the ranks CSV', async () => {
    const csvText = await downloadRanksCsv({
      csvUrl: 'https://example.test/ranks.csv',
      fetchFn: async () => new Response(validCsv),
    });

    expect(csvText).toBe(validCsv);
  });

  test('rejects failed downloads', async () => {
    await expect(
      downloadRanksCsv({
        csvUrl: 'https://example.test/ranks.csv',
        fetchFn: async () => new Response('nope', { status: 503, statusText: 'Unavailable' }),
      }),
    ).rejects.toThrow('Failed to download ranks CSV: 503 Unavailable');
  });

  test('writes the downloaded CSV and bulk-loads it without per-game BGG calls', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'game-ranks-'));
    const outputPath = join(directory, 'boardgames_ranks.csv');
    const batches: unknown[] = [];

    await refreshGameRanks({
      createGamesBatch: (batch) => batches.push(batch),
      csvUrl: 'https://example.test/ranks.csv',
      fetchFn: async () => new Response(validCsv),
      logger: null,
      outputPath,
    });

    expect(await readFile(outputPath, 'utf8')).toBe(validCsv);
    expect(batches).toMatchObject([[{ id: 1, rating: 7.12345, adjustedRating: 6.98765 }]]);
  });

  test('requires a CSV URL', async () => {
    await expect(
      refreshGameRanks({
        createGamesBatch: () => undefined,
        csvUrl: '',
        outputPath: 'unused.csv',
      }),
    ).rejects.toThrow('BOARDGAMES_RANKS_CSV_URL is required.');
  });
});
