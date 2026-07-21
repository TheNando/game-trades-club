import { describe, expect, test } from 'bun:test';
import { json } from './http';

describe('json', () => {
  test('preserves Headers input and response options', () => {
    const response = json(
      { ok: true },
      {
        headers: new Headers({ 'x-request-id': 'request-42' }),
        status: 201,
        statusText: 'Created',
      },
    );

    expect(response.status).toBe(201);
    expect(response.statusText).toBe('Created');
    expect(response.headers.get('x-request-id')).toBe('request-42');
    expect(response.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  test('preserves tuple-array headers and an existing content type', () => {
    const response = json(
      { ok: true },
      {
        headers: [
          ['content-type', 'application/problem+json'],
          ['x-request-id', 'request-42'],
        ],
      },
    );

    expect(response.headers.get('content-type')).toBe('application/problem+json');
    expect(response.headers.get('x-request-id')).toBe('request-42');
  });
});
