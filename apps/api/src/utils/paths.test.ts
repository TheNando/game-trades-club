import { describe, expect, test } from 'bun:test';
import { isAbsolute, join, resolve } from 'node:path';
import { resolveProjectPath } from './paths';

describe('resolveProjectPath', () => {
  test('resolves relative paths from the project root', () => {
    expect(resolveProjectPath('./data/app.db')).toEndWith(join('data', 'app.db'));
    expect(isAbsolute(resolveProjectPath('./data/app.db'))).toBe(true);
  });

  test('preserves absolute paths', () => {
    const absolutePath = resolve('var', 'lib', 'game-trades-club', 'app.db');

    expect(resolveProjectPath(absolutePath)).toBe(absolutePath);
  });
});
