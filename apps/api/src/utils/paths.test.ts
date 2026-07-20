import { describe, expect, test } from 'bun:test';
import { isAbsolute } from 'node:path';
import { resolveProjectPath } from './paths';

describe('resolveProjectPath', () => {
  test('resolves relative paths from the project root', () => {
    expect(resolveProjectPath('./data/app.db')).toMatch(/\/data\/app\.db$/);
    expect(isAbsolute(resolveProjectPath('./data/app.db'))).toBe(true);
  });

  test('preserves absolute paths', () => {
    expect(resolveProjectPath('/var/lib/game-trades-club/app.db')).toBe(
      '/var/lib/game-trades-club/app.db'
    );
  });
});
